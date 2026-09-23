import frappe
import json
import requests
from custom_ui.custom_ui.ai_chat.config import (
    GEMINI_MODEL,
    GEMINI_ENDPOINT,
    MAX_TOKENS,
    MAX_HISTORY,
    SYSTEM_PROMPT,
    GEMINI_TOOLS
)
from custom_ui.custom_ui.ai_chat.tools import execute_tool
from custom_ui.custom_ui.ai_chat.budget import has_enough_balance, log_token_usage

@frappe.whitelist()
def chat(messages, approved_action=None):
    """
    Endpoint called by the chat page.
    messages: JSON string of [{role, content}, ...]
    approved_action: JSON string of tool to execute directly (after user approval)
    Returns: assistant reply string or approval required dict
    """
    try:
        history = json.loads(messages) if isinstance(messages, str) else messages
        if approved_action and isinstance(approved_action, str):
            approved_action = json.loads(approved_action)
    except Exception:
        frappe.throw("Invalid messages format")

    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]

    api_key = frappe.conf.get("gemini_api_key")
    if not api_key:
        frappe.throw(
            "Gemini API key not configured. "
            "Run: bench set-config gemini_api_key 'AIza-your-key'"
        )

    budget_ok, budget_msg = has_enough_balance()
    if not budget_ok:
        return {"error": budget_msg}

    system_text = SYSTEM_PROMPT.format(
        company=frappe.defaults.get_global_default("company") or "Your Company",
        user=frappe.session.user,
        today=frappe.utils.nowdate(),
    )

    # Convert chat history to Gemini format
    contents = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    # If the user just approved an action, artificially inject it so Gemini knows it executed
    new_history = []
    
    def truncate_result(res):
        res_str = json.dumps(res, default=str)
        if len(res_str) > 2000:
            return res_str[:2000] + "... [Truncated]"
        return res_str

    if approved_action:
        action_name = approved_action.get("name")
        action_args = approved_action.get("args") or {}
        result = execute_tool(action_name, action_args)
        status_desc = "successfully executed" if not isinstance(result, dict) or "error" not in result else "failed with error"

        # NOTE: Do NOT inject a synthetic {"functionCall": ...} without thought_signature.
        # Gemini 3.x and thinking models strictly reject functionCall parts lacking thought_signature (Error 400).
        # Supplying the execution result as a clean user system notification allows Gemini to naturally
        # observe the outcome, maintain full conversation context, and generate a friendly confirmation without errors.
        contents.append({
            "role": "user",
            "parts": [{
                "text": (
                    f"[System: User approved and executed action '{action_name}']\n"
                    f"Parameters: {json.dumps(action_args, default=str)}\n"
                    f"Result: {truncate_result(result)}\n\n"
                    f"Please confirm to the user that the action was {status_desc} and summarize the key outcome."
                )
            }]
        })
        new_history.append({
            "role": "assistant",
            "content": f"[System: Executed tool {action_name} with args {json.dumps(action_args)}]"
        })
        new_history.append({
            "role": "user",
            "content": f"[System: Tool result: {truncate_result(result)}]"
        })

    # Call Gemini in a loop to resolve multiple tool calls sequentially
    accumulated_prompt_tokens = 0
    accumulated_response_tokens = 0
    
    for loop_count in range(8):  # limit to 8 turns to avoid infinite loops
        payload = {
            "system_instruction": {"parts": [{"text": system_text}]},
            "contents": contents,
            "tools": GEMINI_TOOLS,
            "generationConfig": {
                "maxOutputTokens": MAX_TOKENS,
                "temperature": 0.2,  # lower temperature is better for tool calling
            }
        }

        active_model = frappe.conf.get("gemini_model") or GEMINI_MODEL
        url = GEMINI_ENDPOINT.format(model=active_model, api_key=api_key)
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload, default=str),
            timeout=30,
        )

        if response.status_code != 200:
            try:
                error_body = response.json()
            except Exception:
                error_body = {"error": {"message": response.text}}
            frappe.throw(f"Gemini API error {response.status_code}: {error_body.get('error', {}).get('message', 'Unknown error')}")

        data = response.json()
        
        usage_meta = data.get("usageMetadata", {})
        pt = usage_meta.get("promptTokenCount", 0)
        rt = usage_meta.get("candidatesTokenCount", 0)
        
        if pt > 0 or rt > 0:
            log_token_usage(active_model, pt, rt, "chat")
            accumulated_prompt_tokens += pt
            accumulated_response_tokens += rt

        candidate = data["candidates"][0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])

        # Check for function calls
        function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

        if function_calls:
            # INTERCEPT RISKY TOOLS FOR APPROVAL
            risky_tools = ["create_document", "update_document", "delete_document", "execute_document_method", "send_email"]
            for call in function_calls:
                name = call.get("name")
                args = call.get("args") or {}
                
                if name in risky_tools:
                    # Return immediate dict response asking for frontend approval
                    return {
                        "requires_approval": True,
                        "tool_call": {"name": name, "args": args},
                        "new_history": new_history,
                        "tokens": {
                            "prompt": accumulated_prompt_tokens,
                            "response": accumulated_response_tokens,
                            "total": accumulated_prompt_tokens + accumulated_response_tokens
                        }
                    }

            # Add the model's tool request message to contents history
            contents.append(content)

            # Execute the function calls safely
            response_parts = []
            for call in function_calls:
                name = call.get("name")
                args = call.get("args") or {}
                result = execute_tool(name, args)
                response_parts.append({
                    "functionResponse": {
                        "name": name,
                        "response": result
                    }
                })
                new_history.append({
                    "role": "assistant",
                    "content": f"[System: Executed tool {name} with args {json.dumps(args)}]"
                })
                new_history.append({
                    "role": "user",
                    "content": f"[System: Tool result: {truncate_result(result)}]"
                })

            # Append the tool results message to contents history
            contents.append({
                "role": "user",
                "parts": response_parts
            })
            # Continue the loop to let Gemini process the tool outputs
            continue
        else:
            # No tool call; return the text response
            try:
                reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
                return {
                    "reply": reply_text,
                    "new_history": new_history,
                    "tokens": {
                        "prompt": accumulated_prompt_tokens,
                        "response": accumulated_response_tokens,
                        "total": accumulated_prompt_tokens + accumulated_response_tokens
                    }
                }
            except IndexError:
                return {"reply": "No response text returned.", "new_history": new_history, "tokens": {}}

    return {"error": "Max tool execution turns reached."}

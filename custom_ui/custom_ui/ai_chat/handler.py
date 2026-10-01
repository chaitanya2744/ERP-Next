import re
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
def chat(messages, approved_action=None, voice_gender="female"):
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
    system_text += "\n\nCRITICAL RULE: When executing tools to retrieve data, the volume of data MUST be MODERATE—no less, no more. Do not fetch massive datasets that overload tokens, but ensure you retrieve enough rows to provide complete context."

    if not voice_gender or not isinstance(voice_gender, str):
        voice_gender = "female"
    voice_gender = voice_gender.lower().strip()
    if voice_gender not in ["female", "male"]:
        voice_gender = "female"

    if voice_gender == "female":
        system_text += (
            "\n\nVOICE PERSONA & GRAMMATICAL GENDER REQUIREMENT (STRICT):\n"
            "You are a professional female AI assistant.\n"
            "When responding in languages that distinguish grammatical gender in first person (such as Marathi and Hindi), "
            "you MUST strictly use feminine first-person grammatical forms and inflections.\n"
            "- In Marathi: Always use feminine verb endings like 'मी करू शकते' (NEVER 'शकतो'), 'मी मदत करते' (NEVER 'करतो'), "
            "'मी शोध घेते' (NEVER 'घेतो'), 'मी तयार केली आहे' / 'मी बनवली आहे' (NEVER 'केला'), 'मी सांगेन', 'मी पाहिले'.\n"
            "- In Hindi: Always use feminine verb endings like 'मैं कर सकती हूँ' (NEVER 'सकता हूँ'), 'मैं मदद करती हूँ' (NEVER 'करता हूँ'), "
            "'मैं देखती हूँ' (NEVER 'देखता हूँ'), 'मैंने तैयार कर दी है' (NEVER 'कर दिया है'), 'मैं बताऊँगी' (NEVER 'बताऊँगा').\n"
            "- Maintain this feminine persona consistently across all conversational turns and explanations."
        )
    elif voice_gender == "male":
        system_text += (
            "\n\nVOICE PERSONA & GRAMMATICAL GENDER REQUIREMENT (STRICT):\n"
            "You are a professional male AI assistant.\n"
            "When responding in languages that distinguish grammatical gender in first person (such as Marathi and Hindi), "
            "use masculine first-person grammatical forms (e.g. 'मी करू शकतो', 'मी करतो' in Marathi; 'मैं कर सकता हूँ', 'मैं करता हूँ' in Hindi)."
        )

    # Convert chat history to Gemini format
    contents = []
    for msg in history:
        text = msg.get("content", "")
        # Prevent contaminated history from leaking fake system prompts to model
        if text.startswith("[System:"):
            continue
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": text}]
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
    
    user_prompt = history[-1]["content"] if history and history[-1]["role"] == "user" else ""



    # 1. Bypass & Fast Resolution
    active_tools = GEMINI_TOOLS
    if not approved_action and user_prompt:
        try:
            from custom_ui.custom_ui.ai_chat.router import route_and_prune
            try:
                from custom_ui.custom_ui.ai_chat.fast_resolver import attempt_fast_resolution
            except ImportError:
                attempt_fast_resolution = None

            # Context-aware routing for short conversational follow-ups
            routing_prompt = user_prompt
            if len(history) >= 2 and len(user_prompt.split()) <= 10:
                prev_ctx = history[-2].get("content", "")
                if prev_ctx:
                    routing_prompt = f"Context: {prev_ctx[-300:]}\nFollow-up: {user_prompt}"

            route_info = route_and_prune(routing_prompt)
            # Safeguard: if JEV flags general_chat on a multi-turn conversation, keep analytics tools available
            if route_info.get("query_type") == "general_chat" and len(history) >= 3:
                route_info["selected_tools"] = ["execute_sql_query", "execute_frappe_report"]
            
            if not route_info["needs_llm"] and attempt_fast_resolution:
                fast_data = attempt_fast_resolution(user_prompt, route_info["query_type"])
                if fast_data:
                    fast_data = f"⚡ **Laya Fast-Path Resolution (0 Tokens & 0s Latency)**\n\n{fast_data}"
                    # Return immediately, zero cost
                    return {
                        "reply": fast_data,
                        "new_history": new_history,
                        "tokens": {"prompt": 0, "response": 0, "total": 0}
                    }

            # 2. Prune Tools for Complex Queries
            if route_info["selected_tools"] is not None:
                pruned_count = len(GEMINI_TOOLS[0]["functionDeclarations"]) - len(route_info["selected_tools"])


                active_tools = [
                    {
                        "functionDeclarations": [
                            t for t in GEMINI_TOOLS[0]["functionDeclarations"] 
                            if t["name"] in route_info["selected_tools"]
                        ]
                    }
                ]
        except Exception as e:
            print(f"Router error (falling back to all tools): {e}")

    for loop_count in range(15):  # limit to 8 turns to avoid infinite loops
        payload = {
            "system_instruction": {"parts": [{"text": system_text}]},
            "contents": contents,
            "tools": active_tools,
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
            accumulated_prompt_tokens += pt
            accumulated_response_tokens += rt

        candidate = data["candidates"][0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])

        # Check for function calls
        function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]

        print(f"\n>>> [TURN {loop_count}] Function calls: {json.dumps(function_calls, default=str)}")
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
                print(f"<<< [TURN {loop_count}] Tool {name} result: {str(result)[:250]}")
                response_parts.append({
                    "functionResponse": {
                        "name": name,
                        "response": result
                    }
                })


            # Append the tool results message to contents history
            contents.append({
                "role": "user",
                "parts": response_parts
            })
            # Continue the loop to let Gemini process the tool outputs
            continue
        else:
            # Check if Gemini outputted raw tool execution text instead of functionCall
            reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
            raw_tool_match = re.search(r'\[System: Executed tool (\w+) with args\s*(\{.*?\})\]', reply_text, re.DOTALL)
            if raw_tool_match:
                tool_name = raw_tool_match.group(1)
                try:
                    tool_args = json.loads(raw_tool_match.group(2), strict=False)
                    print(f">>> Intercepting raw tool text from model: {tool_name}")
                    tool_result = execute_tool(tool_name, tool_args)
                    contents.append({
                        "role": "model",
                        "parts": [{"text": reply_text}]
                    })
                    contents.append({
                        "role": "user",
                        "parts": [{"text": f"Tool '{tool_name}' result:\n{json.dumps(tool_result, default=str)}"}]
                    })
                    continue
                except Exception as intercept_err:
                    print(f"Failed to parse raw tool text: {intercept_err}")

            # No tool call; return the text response
            if accumulated_prompt_tokens > 0 or accumulated_response_tokens > 0:
                log_token_usage(active_model, accumulated_prompt_tokens, accumulated_response_tokens, "chat")

            try:
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

    if accumulated_prompt_tokens > 0 or accumulated_response_tokens > 0:
        log_token_usage(active_model, accumulated_prompt_tokens, accumulated_response_tokens, "chat")

    return {"error": "Max tool execution turns reached."}

import os
import requests
import frappe
from custom_ui.custom_ui.ai_chat.budget import log_token_usage

JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
JEV_API_KEY = os.getenv("JEV_API_KEY") or getattr(frappe.conf, "jev_api_key", None) or "apikey_2153796ebf47547745e9be43447d7896f359_f99fb92ac76509b231bce448bef6068cd4868510d023da1ad77ebded92be83f9"

TOOL_MAPPINGS = {
    "direct_lookup": ["execute_sql_query", "get_documents", "get_document", "describe_doctype"],
    "analytics": ["execute_sql_query", "execute_frappe_report"],
    "action": ["describe_doctype", "create_document", "update_document", "delete_document", "execute_document_method", "send_email"],
    "general_chat": []
}

def route_and_prune(user_prompt: str):
    """
    Calls TypeSafe Jev System One engine to classify intent, prune schemas,
    and logs token usage directly to AI Token Usage Log for 100% visibility.
    """
    headers = {
        "Authorization": f"Bearer {JEV_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "jev-latest",
        "state": user_prompt,
        "questions": {
            "query_type": {
                "type": "choice",
                "instructions": "Classify the ERP intent of the user prompt.",
                "criteria": {
                    "direct_lookup": "Looking up records, listing purchase orders, sales orders, stock balances, customers, invoices, or simple doc status",
                    "analytics": "Aggregated analytics, financial trends, profitability, complex business reports",
                    "action": "Creating, modifying, updating, submitting, or cancelling a document",
                    "general_chat": "Greetings, chit-chat, bot identity, polite remarks, non-ERP questions"
                }
            },
            "needs_llm": {
                "type": "noul",
                "instructions": "Does this query require multi-step reasoning or complex natural language generation?"
            }
        }
    }

    try:
        response = requests.post(JEV_ENDPOINT, headers=headers, json=payload, timeout=4)
        if response.status_code == 200:
            data = response.json()
            answers = data.get("answers", {})
            usage = data.get("usage", {})

            query_choice = answers.get("query_type", {})
            query_type = query_choice.get("choice", "direct_lookup")
            confidence = query_choice.get("confidence", 1.0)
            
            noul_val = answers.get("needs_llm", {}).get("noul", 0.0)
            needs_llm = bool(noul_val > 0.6)

            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)

            selected_tools = TOOL_MAPPINGS.get(query_type, TOOL_MAPPINGS["direct_lookup"])

            # 100% Visibility: Log JEV tokens and decision into Frappe AI Token Usage Log
            if input_tokens > 0 or output_tokens > 0:
                try:
                    log_token_usage(
                        model_name="typesafe-jev",
                        prompt_tokens=input_tokens,
                        response_tokens=output_tokens,
                        api_method="router",
                        description=f"JEV Router: {query_type} (Conf: {int(confidence*100)}% | Pruned: {len(selected_tools)} tools)"
                    )
                except Exception as log_err:
                    frappe.log_error(f"JEV Token Logging Error: {log_err}", "AI Router")

            return {
                "needs_llm": needs_llm,
                "query_type": query_type,
                "selected_tools": selected_tools,
                "confidence": confidence,
                "jev_tokens": {
                    "prompt": input_tokens,
                    "response": output_tokens,
                    "total": input_tokens + output_tokens
                }
            }
        else:
            frappe.log_error(f"JEV API Error {response.status_code}: {response.text}", "AI Router")
    except Exception as e:
        frappe.log_error(f"JEV Router Exception: {e}", "AI Router")

    # Safe Fallback to Gemini with all tools
    return {
        "needs_llm": True,
        "query_type": "complex_analytics",
        "selected_tools": None,
        "confidence": 0.0,
        "jev_tokens": {"prompt": 0, "response": 0, "total": 0}
    }

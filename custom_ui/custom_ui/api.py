import frappe
from custom_ui.custom_ui.ai_chat.handler import chat
from custom_ui.custom_ui.ai_chat.budget import calculate_costs

@frappe.whitelist()
def get_wallet_summary():
    try:
        settings = frappe.get_single("AI Settings")
        balance_inr = getattr(settings, "balance_inr", 0.0) or 0.0
        total_consumed_inr = getattr(settings, "total_consumed_inr", 0.0) or 0.0
        
        # Today's tokens and count
        today_stats = frappe.db.sql("""
            SELECT 
                COALESCE(SUM(total_tokens), 0) as today_tokens,
                COALESCE(SUM(charged_cost_inr), 0) as today_cost_inr,
                COUNT(name) as total_requests
            FROM `tabAI Token Usage Log`
            WHERE DATE(creation) = CURDATE()
        """, as_dict=True)
        
        today_data = today_stats[0] if today_stats else {"today_tokens": 0, "today_cost_inr": 0, "total_requests": 0}
        
        return {
            "balance_inr": round(float(balance_inr), 2),
            "total_consumed_inr": round(float(total_consumed_inr), 2),
            "today_tokens": int(today_data["today_tokens"]),
            "today_cost_inr": round(float(today_data["today_cost_inr"]), 2),
            "today_requests": int(today_data["total_requests"]),
            "currency": "INR"
        }
    except Exception as e:
        frappe.log_error("get_wallet_summary failed", str(e))
        return {"balance_inr": 0.0, "today_tokens": 0, "today_cost_inr": 0.0}

@frappe.whitelist()
def estimate_tokens_and_cost(text, model_name=None):
    if not text:
        return {"prompt_tokens": 0, "estimated_reply_tokens": 0, "total_estimated_tokens": 0, "charged_cost_inr": 0.0, "charged_cost_usd": 0.0}
    
    # Standard heuristic: 1 token ≈ 4 characters or ~0.75 words
    est_prompt_tokens = max(1, int(len(text) / 3.8))
    est_reply_tokens = 250
    
    model = model_name or "gemini-2.5-flash"
    costs = calculate_costs(model, est_prompt_tokens, est_reply_tokens)
    
    return {
        "prompt_tokens": est_prompt_tokens,
        "estimated_reply_tokens": est_reply_tokens,
        "total_estimated_tokens": est_prompt_tokens + est_reply_tokens,
        "charged_cost_inr": round(costs["charged_cost_inr"], 4),
        "charged_cost_usd": round(costs["charged_cost_usd"], 6),
        "exchange_rate": costs["exchange_rate_used"]
    }

import frappe
from custom_ui.custom_ui.ai_chat.handler import chat
from custom_ui.custom_ui.wallet import estimate_tokens_and_cost_data, get_wallet_summary_data

@frappe.whitelist()
def get_wallet_summary():
    return get_wallet_summary_data()

@frappe.whitelist()
def estimate_tokens_and_cost(text, model_name=None):
    return estimate_tokens_and_cost_data(text, model_name=model_name)

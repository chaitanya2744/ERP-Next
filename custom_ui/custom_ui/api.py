import frappe
from custom_ui.custom_ui.ai_chat.handler import chat
from custom_ui.custom_ui.wallet import estimate_tokens_and_cost_data, get_wallet_summary_data

@frappe.whitelist()
def get_wallet_summary():
    return get_wallet_summary_data()

@frappe.whitelist()
def estimate_tokens_and_cost(text, model_name=None):
    return estimate_tokens_and_cost_data(text, model_name=model_name)

import json

@frappe.whitelist()
def list_sessions(limit=20):
    user = frappe.session.user
    return frappe.get_all(
        "AI Chat Session",
        filters={"user": user},
        fields=["name", "title", "status", "modified"],
        order_by="modified desc",
        limit_page_length=limit
    )

@frappe.whitelist()
def get_session(session_id):
    user = frappe.session.user
    if not frappe.db.exists("AI Chat Session", {"name": session_id, "user": user}):
        frappe.throw("Session not found or access denied")
    
    doc = frappe.get_doc("AI Chat Session", session_id)
    return {
        "name": doc.name,
        "title": doc.title,
        "status": doc.status,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp
            } for msg in doc.messages
        ]
    }

@frappe.whitelist()
def save_session(session_id=None, messages="[]", title=None):
    user = frappe.session.user
    msgs = json.loads(messages)
    
    if not session_id:
        doc = frappe.new_doc("AI Chat Session")
        doc.user = user
        if title:
            doc.title = title
        elif msgs and len(msgs) > 0:
            doc.title = msgs[0].get("content", "New Chat")[:60]
        else:
            doc.title = "New Chat"
    else:
        if not frappe.db.exists("AI Chat Session", {"name": session_id, "user": user}):
            frappe.throw("Session not found or access denied")
        doc = frappe.get_doc("AI Chat Session", session_id)
        
    doc.set("messages", [])
    for msg in msgs:
        doc.append("messages", {
            "role": msg.get("role"),
            "content": msg.get("content")
        })
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.name

@frappe.whitelist()
def delete_session(session_id):
    user = frappe.session.user
    if frappe.db.exists("AI Chat Session", {"name": session_id, "user": user}):
        frappe.delete_doc("AI Chat Session", session_id, ignore_permissions=True)
        return True
    return False

@frappe.whitelist()
def rename_session(session_id, new_title):
    user = frappe.session.user
    if not frappe.db.exists("AI Chat Session", {"name": session_id, "user": user}):
        frappe.throw("Session not found or access denied")
    frappe.db.set_value("AI Chat Session", session_id, "title", new_title)
    return True

import frappe
from custom_ui.custom_ui.ai_chat.handler import chat
from custom_ui.custom_ui.wallet import estimate_tokens_and_cost_data, get_wallet_summary_data

@frappe.whitelist()
def save_ai_memory(category, learned_context, trigger_keywords="", scope="User"):
    """Save a memory rule. Called from chat UI or manually."""
    from custom_ui.custom_ui.ai_chat.memory import capture_memory
    name = capture_memory(
        category=category,
        learned_context=learned_context,
        trigger_keywords=trigger_keywords,
        source="Manual"
    )
    return {"status": "ok", "name": name}

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

@frappe.whitelist()
def save_theme_colors(colors):
    """Save global theme colors (admin level) and clear cache"""
    if "System Manager" not in frappe.get_roles() and frappe.session.user != "Administrator":
        frappe.throw("Only System Managers / Administrators can change global theme colors")
    
    frappe.db.set_default("custom_ui_theme_colors", colors)
    frappe.clear_cache()
    frappe.db.commit()
    return {"status": "success", "message": "Global theme colors updated and cache cleared"}

@frappe.whitelist()
def get_theme_colors():
    """Retrieve global theme colors"""
    colors = frappe.db.get_default("custom_ui_theme_colors")
    if colors:
        try:
            return json.loads(colors) if isinstance(colors, str) else colors
        except Exception:
            return colors
    return None

def add_theme_colors_to_bootinfo(bootinfo):
    """Inject theme colors into bootinfo on every desk session"""
    colors = frappe.db.get_default("custom_ui_theme_colors")
    if colors:
        try:
            val = json.loads(colors) if isinstance(colors, str) else colors
        except Exception:
            val = colors
        
        try:
            bootinfo.custom_ui_theme_colors = val
        except Exception:
            pass
        if isinstance(bootinfo, dict):
            bootinfo["custom_ui_theme_colors"] = val


def seed_default_executive_prompts():
    """Seed standard executive prompts from default_prompts.json if empty."""
    import os
    json_path = os.path.join(
        frappe.get_app_path("custom_ui"),
        "custom_ui", "doctype", "ai_executive_prompt", "default_prompts.json"
    )
    if not os.path.exists(json_path):
        return
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for idx, p in enumerate(data.get("prompts", [])):
            doc = frappe.new_doc("AI Executive Prompt")
            doc.title = p.get("title")
            doc.module = p.get("module")
            doc.category = p.get("category") or (
                "employee" if p.get("module") in ["Attendance", "Timesheet", "Leaves", "Salary", "Expenses"]
                else ("hr" if p.get("module") in ["Team Attendance", "Leave Approvals", "Payroll", "Analytics", "Recruitment"]
                else "erp")
            )
            doc.icon = p.get("icon") or ""
            doc.prompt_type = p.get("type") or "Quick Action"
            doc.chart = p.get("chart")
            doc.desc = p.get("desc")
            doc.prompt = p.get("prompt")
            doc.sequence = idx * 10
            doc.enabled = 1
            doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.log_error("Failed to seed AI Executive Prompts", str(e))


@frappe.whitelist()
def get_executive_prompts():
    """Retrieve enabled AI Executive Prompts from the database scoped to user's roles."""
    user = frappe.session.user
    roles = set(frappe.get_roles(user)) if user else set()

    is_employee = bool(roles & {"Employee", "Employee Self Service"})
    is_hr = bool(roles & {"HR Manager", "HR User"})
    is_admin = bool(roles & {"System Manager", "Administrator"})
    has_mfg = bool(roles & {"Manufacturing Manager", "Manufacturing User"})
    is_standard_employee = is_employee and not is_admin and not is_hr and not has_mfg

    if is_standard_employee:
        allowed_categories = ["employee"]
    elif is_hr and not is_admin and not has_mfg:
        allowed_categories = ["hr", "employee"]
    else:
        allowed_categories = ["employee", "hr", "erp"]

    if frappe.db.count("AI Executive Prompt") == 0:
        seed_default_executive_prompts()

    prompts_data = frappe.get_all(
        "AI Executive Prompt",
        filters={"enabled": 1, "category": ["in", allowed_categories]},
        fields=[
            "name as id", "name", "title", "module", "category", "icon",
            "prompt_type as type", "chart", "desc", "prompt", "sequence"
        ],
        order_by="sequence asc, creation asc",
        limit_page_length=300
    )

    filtered_prompts = []
    for p in prompts_data:
        allowed_roles = frappe.db.sql(
            "SELECT role FROM `tabHas Role` WHERE parent=%s AND parenttype='AI Executive Prompt'",
            p["name"],
            pluck="role"
        )
        if allowed_roles and not (set(allowed_roles) & roles):
            continue
        filtered_prompts.append(p)

    return {"prompts": filtered_prompts}

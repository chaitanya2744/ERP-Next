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
import re
import os

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


def _hex_to_rgb(hex_code):
    hex_code = hex_code.lstrip("#").strip()
    if len(hex_code) == 3:
        hex_code = "".join(c + c for c in hex_code)
    if len(hex_code) != 6:
        return (0, 0, 0)
    num = int(hex_code, 16)
    return ((num >> 16) & 255, (num >> 8) & 255, num & 255)

def _rgb_to_hex(r, g, b):
    clamp = lambda v: max(0, min(255, round(v)))
    return f"#{clamp(r):02X}{clamp(g):02X}{clamp(b):02X}"

def _rgb_to_hsl(r, g, b):
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    max_c, min_c = max(r, g, b), min(r, g, b)
    l = (max_c + min_c) / 2.0
    if max_c == min_c:
        h = s = 0.0
    else:
        d = max_c - min_c
        s = d / (2.0 - max_c - min_c) if l > 0.5 else d / (max_c + min_c)
        if max_c == r:
            h = (g - b) / d + (6.0 if g < b else 0.0)
        elif max_c == g:
            h = (b - r) / d + 2.0
        else:
            h = (r - g) / d + 4.0
        h /= 6.0
    return (round(h * 360), round(s * 100), round(l * 100))

def _hsl_to_rgb(h, s, l):
    h, s, l = h / 360.0, s / 100.0, l / 100.0
    if s == 0:
        r = g = b = l
    else:
        def hue2rgb(p, q, t):
            if t < 0: t += 1
            if t > 1: t -= 1
            if t < 1/6: return p + (q - p) * 6 * t
            if t < 1/2: return q
            if t < 2/3: return p + (q - p) * (2/3 - t) * 6
            return p
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1/3)
    return (round(r * 255), round(g * 255), round(b * 255))

def _adjust_lightness(hex_code, percent):
    r, g, b = _hex_to_rgb(hex_code)
    h, s, l = _rgb_to_hsl(r, g, b)
    new_l = max(0, min(100, l + percent))
    nr, ng, nb = _hsl_to_rgb(h, s, new_l)
    return _rgb_to_hex(nr, ng, nb)

def _set_lightness(hex_code, target_l):
    r, g, b = _hex_to_rgb(hex_code)
    h, s, _ = _rgb_to_hsl(r, g, b)
    nr, ng, nb = _hsl_to_rgb(h, s, target_l)
    return _rgb_to_hex(nr, ng, nb)

def _normalize_hex(hex_code, fallback):
    if not hex_code or not isinstance(hex_code, str):
        return fallback
    hex_code = hex_code.strip()
    if not hex_code.startswith("#"):
        hex_code = "#" + hex_code
    if re.match(r"^#[0-9A-Fa-f]{6}$", hex_code):
        return hex_code.upper()
    if re.match(r"^#[0-9A-Fa-f]{3}$", hex_code):
        return f"#{hex_code[1]*2}{hex_code[2]*2}{hex_code[3]*2}".upper()
    return fallback

def generate_active_theme_css(colors=None):
    """Write public/css/active_theme.css synchronously for 100% zero-FOUC on reload"""
    if colors is None:
        raw = frappe.db.get_default("custom_ui_theme_colors")
        if raw:
            try:
                colors = json.loads(raw) if isinstance(raw, str) else raw
            except Exception:
                colors = {}
        else:
            colors = {}

    if isinstance(colors, str):
        try:
            colors = json.loads(colors)
        except Exception:
            colors = {}
    if not isinstance(colors, dict):
        colors = {}

    primary = _normalize_hex(colors.get("primary"), "#4083CA")
    accent = _normalize_hex(colors.get("accent"), "#F68714")
    bg = _normalize_hex(colors.get("bg"), "#F5F5F7")
    surface = _normalize_hex(colors.get("surface"), "#FFFFFF")
    text = _normalize_hex(colors.get("text"), "#1D1D1F")

    pr, pg, pb = _hex_to_rgb(primary)
    ar, ag, ab = _hex_to_rgb(accent)

    primary_dk = _adjust_lightness(primary, -12)
    primary_darkest = _adjust_lightness(primary, -28)
    primary_lt = _adjust_lightness(primary, 14)
    accent_lt = _set_lightness(accent, 93)
    accent_xlt = _set_lightness(accent, 97)
    text_sub = _adjust_lightness(text, 20)
    text_muted = _adjust_lightness(text, 40)
    text_faint = _adjust_lightness(text, 55)
    surface2 = _adjust_lightness(surface, -4)

    css_content = f"""/* ==========================================================================
   ACTIVE THEME STYLESHEET (Auto-generated from Customizer Settings)
   Synchronously loaded in <head> to guarantee 100% Zero-FOUC & Zero-Teal on refresh
   ========================================================================== */

:root,
html,
body,
html.theme-apple,
body.theme-apple,
body.theme-v9,
body.ai-assistant-page-active {{
    /* Custom UI Core Tokens */
    --cu-primary: {primary} !important;
    --cu-primary-rgb: {pr}, {pg}, {pb} !important;
    --cu-primary-dk: {primary_dk} !important;
    --cu-primary-lt: {primary_lt} !important;
    --cu-accent: {accent} !important;
    --cu-accent-rgb: {ar}, {ag}, {ab} !important;
    --cu-accent-lt: {accent_lt} !important;
    --cu-accent-xlt: {accent_xlt} !important;
    --cu-bg: {bg} !important;
    --cu-surface: {surface} !important;
    --cu-surface-solid: {surface} !important;
    --cu-surface-2: {surface2} !important;
    --cu-text: {text} !important;
    --cu-text-sub: {text_sub} !important;
    --cu-text-muted: {text_muted} !important;
    --cu-text-faint: {text_faint} !important;
    --primary: {primary} !important;
    --brand-color: {primary} !important;

    /* AI Chat Screen Variables */
    --pro-primary: {primary} !important;
    --pro-primary-hover: {primary_dk} !important;
    --pro-accent: {accent} !important;
    --pro-surface: {surface} !important;
    --pro-text-main: {text} !important;
    --pro-text-muted: {text_muted} !important;
    --chat-bg: {bg} !important;
    --bubble-user: {primary} !important;
    --bubble-user-text: #FFFFFF !important;
    --bubble-ai: {surface} !important;
    --bubble-ai-text: {text} !important;
    --send-btn: {primary} !important;
    --send-btn-hover: {primary_dk} !important;
    --input-focus: {accent} !important;
}}

/* 1. Canvas & Background Overrides */
body,
body.theme-apple,
body.theme-apple #body,
body.theme-apple .page-container,
body.theme-apple .layout-main,
body.theme-apple .layout-main-section,
body.theme-apple .workspace-page,
body.theme-v9,
body.ai-assistant-page-active,
body.ai-assistant-page-active #body,
body.ai-assistant-page-active .ai-assistant-page-wrapper,
body.ai-assistant-page-active #ai-chat-root {{
    background: {bg} !important;
    background-color: {bg} !important;
}}

/* 2. Surface & Cards & Header Overrides */
body.theme-apple .page-head,
body.theme-apple .layout-side-section,
body.theme-apple .body-sidebar,
body.theme-apple .desk-sidebar,
body.theme-apple .widget,
body.theme-apple .frappe-card,
body.theme-apple .form-section,
body.theme-apple .modal-content,
body.theme-apple .chart-widget-box {{
    background: {surface} !important;
    background-color: {surface} !important;
}}

/* 3. Top Navbar Overrides */
header.navbar-container,
header.desktop-navbar,
.desktop-navbar,
.navbar-container,
body.theme-apple .navbar {{
    background: linear-gradient(180deg, {primary_darkest}F5 0%, {primary_dk}EE 100%) !important;
    border-bottom: 1px solid {accent}55 !important;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35) !important;
}}

/* 4. Action Buttons (Create, Save, Submit, Primary) */
body.theme-apple .primary-action,
body.theme-apple .page-head .btn-primary,
body.theme-apple .btn-primary,
body.theme-apple button.btn-primary,
body.theme-v9 .btn-primary,
.btn-primary,
.primary-action {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
    background-color: {primary} !important;
    border: 1px solid {primary_dk} !important;
    border-color: {primary_dk} !important;
    color: #FFFFFF !important;
    box-shadow: 0 2px 8px {primary}4D !important;
}}

body.theme-apple .primary-action:hover,
body.theme-apple .page-head .btn-primary:hover,
body.theme-apple .btn-primary:hover,
body.theme-apple button.btn-primary:hover {{
    background: linear-gradient(180deg, {primary} 0%, {primary_dk} 100%) !important;
    background-color: {primary_dk} !important;
    border-color: {primary_dk} !important;
    box-shadow: 0 4px 12px {primary}66 !important;
}}

/* 5. Form Tabs */
body.theme-apple .form-tabs-list .nav-link.active,
body.theme-v9 .form-tabs-list .nav-link.active,
body.theme-apple .form-tabs .nav-link.active,
body.theme-v9 .form-tabs .nav-link.active,
.form-tabs-list .nav-link.active,
.form-tabs .nav-link.active {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
    background-color: {primary} !important;
    color: #FFFFFF !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 8px {primary}52, 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}}

body.theme-apple .form-tabs-list .nav-link:hover,
body.theme-v9 .form-tabs-list .nav-link:hover,
body.theme-apple .form-tabs .nav-link:hover {{
    color: {primary} !important;
}}

/* 6. Sidebar Active Navigation */
body.theme-apple .active-sidebar,
body.theme-apple .standard-sidebar-item.selected,
body.theme-apple .sidebar-item.selected,
body.theme-v9 .active-sidebar {{
    background: linear-gradient(135deg, {primary} 0%, {accent} 100%) !important;
    color: #FFFFFF !important;
}}

body.theme-apple .active-sidebar .item-anchor,
body.theme-apple .active-sidebar .sidebar-item-label,
body.theme-apple .standard-sidebar-item.selected .sidebar-item-label {{
    color: #FFFFFF !important;
}}

body.theme-apple .active-sidebar .sidebar-item-icon svg,
body.theme-apple .standard-sidebar-item.selected .sidebar-item-icon svg {{
    color: #FFFFFF !important;
    fill: #FFFFFF !important;
    stroke: #FFFFFF !important;
}}

/* 7. Widgets & Badges */
body.theme-apple .shortcut-widget-box::before,
body.theme-apple .widget.shortcut-widget-box::before {{
    background: linear-gradient(180deg, {accent} 0%, {primary} 100%) !important;
}}
body.theme-apple .number-widget-box::before {{
    background: linear-gradient(90deg, {accent} 0%, {primary} 100%) !important;
}}
body.theme-apple .number-widget-box .number {{
    background: linear-gradient(135deg, {primary_dk} 0%, {primary} 50%, {accent} 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
}}
body.theme-apple .badge-primary {{
    background: {primary} !important;
    color: #FFFFFF !important;
}}

/* 8. Links & Icons */
body.theme-apple a.text-primary,
body.theme-apple .text-primary,
body.theme-apple .sidebar-header .sidebar-item-icon svg {{
    color: {primary} !important;
}}

/* 9. AI Chat Components */
.hero-avatar-core,
#hero-avatar-core,
body.ai-assistant-page-active .hero-avatar-core,
body.ai-assistant-page-active #hero-avatar-core {{
    background: radial-gradient(circle at 35% 28%, {primary_lt} 0%, {primary} 48%, {primary_darkest} 100%) !important;
    box-shadow: 
        0 10px 26px -3px {primary}73,
        0 0 16px {accent}59,
        inset 0 1.5px 2px rgba(255, 255, 255, 0.85),
        inset 0 -2px 3px rgba(0, 0, 0, 0.35) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
    color: #FFFFFF !important;
}}

.hero-avatar-halo,
body.ai-assistant-page-active .hero-avatar-halo {{
    background: conic-gradient(from 0deg, {accent_lt}, {accent}, {primary_lt}, {primary}, {accent_lt}) !important;
    opacity: 0.85 !important;
}}

.hero-avatar-ring,
body.ai-assistant-page-active .hero-avatar-ring {{
    border: 1.5px solid {accent}80 !important;
}}

.hero-ambient-glow,
body.ai-assistant-page-active .hero-ambient-glow {{
    background: radial-gradient(circle, {primary_lt}50 0%, {primary}20 40%, rgba(0, 0, 0, 0) 70%) !important;
}}

.hero-status-ping,
.hero-ping-wave,
body.ai-assistant-page-active .hero-status-ping,
body.ai-assistant-page-active .hero-ping-wave {{
    background: {accent} !important;
}}

.welcome-headline,
body.theme-apple .welcome-headline,
.welcome-title,
.hero-title,
body.ai-assistant-page-active .welcome-headline,
body.ai-assistant-page-active .welcome-title,
body.ai-assistant-page-active .hero-title {{
    background: linear-gradient(135deg, {text} 15%, {primary} 65%, {accent} 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}}

body.theme-apple #chat-header .avatar,
#chat-header .avatar {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
}}

body.theme-apple #new-chat-btn,
#new-chat-btn {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
    color: #FFFFFF !important;
}}

body.theme-apple .msg-row.user .msg-bubble,
.msg-row.user .msg-bubble,
.chat-bubble-user {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
    color: #FFFFFF !important;
}}

body.theme-apple #send-btn,
#send-btn,
#ai-send-btn,
.ai-chat-send-btn,
.pro-send-btn {{
    background: linear-gradient(180deg, {primary_lt} 0%, {primary} 100%) !important;
    color: #FFFFFF !important;
}}

.exec-tab-btn.active {{
    background: linear-gradient(135deg, {primary_lt} 0%, {primary} 100%) !important;
    border-color: transparent !important;
    color: #FFFFFF !important;
    box-shadow: 0 3px 10px {primary}40 !important;
}}

.exec-action-btn.run {{
    background: linear-gradient(135deg, {primary_lt} 0%, {primary} 100%) !important;
    color: #FFFFFF !important;
    box-shadow: 0 2px 6px {primary}40 !important;
}}

/* 10. Form Controls (Radio / Checkbox / Focus Rings) */
input[type="radio"]:checked,
.radio input[type="radio"]:checked,
.form-check-input[type="radio"]:checked {{
    border-color: {primary} !important;
    background-color: {primary} !important;
}}
input[type="checkbox"]:checked,
.checkbox input[type="checkbox"]:checked,
.form-check-input[type="checkbox"]:checked {{
    border-color: {primary} !important;
    background-color: {primary} !important;
}}

/* Global Search Filter Pills Active State */
.search-dialog button.global-search-filter-pill.active {{
    background: {primary} !important;
    color: #FFFFFF !important;
    border-color: {primary} !important;
}}
"""
    try:
        app_path = frappe.get_app_path("custom_ui")
        out_file = os.path.join(app_path, "public", "css", "active_theme.css")
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(css_content)
    except Exception as e:
        frappe.log_error(f"Error generating active_theme.css: {str(e)}")

@frappe.whitelist()
def save_theme_colors(colors):
    """Save global theme colors (admin level), regenerate active_theme.css and clear cache"""
    if "System Manager" not in frappe.get_roles() and frappe.session.user != "Administrator":
        frappe.throw("Only System Managers / Administrators can change global theme colors")
    
    frappe.db.set_default("custom_ui_theme_colors", colors)
    generate_active_theme_css(colors)
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

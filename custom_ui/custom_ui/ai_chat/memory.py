"""
AI Memory Engine — Remember → Improve loop.
Zero external deps. Pure Frappe/MariaDB.

Scoping: Per-User only (each user has their own memory lane).
Expiry:  90 days of inactivity auto-disables a rule.
"""
import frappe
from frappe.utils import today, add_days, now_datetime

# Confidence threshold — at or above this a rule is ALWAYS injected
_ALWAYS_INJECT_THRESHOLD = 0.8
# Hard cap on injected rules to keep token cost low
_MAX_INJECT = 6
# Days of inactivity before a rule auto-expires
_EXPIRY_DAYS = 90


# ─────────────────────────────────────────────────────────────────────────────
# LOAD
# ─────────────────────────────────────────────────────────────────────────────

def load_memories(user_prompt: str, user: str) -> str:
    """
    Returns a formatted string of relevant memories to append to system_text.
    Keyword-intersection match + confidence gate. Updates hit_count + last_used.
    """
    prompt_lower = user_prompt.lower()
    today_date = today()

    all_memories = frappe.get_all(
        "AI Memory",
        filters={"enabled": 1, "user": user},
        fields=[
            "name", "trigger_keywords", "learned_context",
            "confidence_score", "expires_on"
        ],
        order_by="confidence_score desc",
        limit=60
    )

    matched = []
    for m in all_memories:
        # Skip expired
        if m.expires_on and str(m.expires_on) < today_date:
            # Auto-disable stale rule
            frappe.db.set_value("AI Memory", m.name, "enabled", 0,
                                update_modified=False)
            continue

        score = m.confidence_score or 1.0

        if score >= _ALWAYS_INJECT_THRESHOLD:
            matched.append(m)
        elif m.trigger_keywords:
            keywords = [k.strip().lower()
                        for k in m.trigger_keywords.split(",") if k.strip()]
            if any(kw and kw in prompt_lower for kw in keywords):
                matched.append(m)

        if len(matched) >= _MAX_INJECT:
            break

    if not matched:
        return ""

    # Bump hit_count + last_used + roll expiry window forward
    new_expiry = add_days(today_date, _EXPIRY_DAYS)
    names = [m.name for m in matched]
    frappe.db.sql(
        f"""UPDATE `tabAI Memory`
            SET hit_count = hit_count + 1,
                last_used = NOW(),
                expires_on = %s
            WHERE name IN ({','.join(['%s'] * len(names))})""",
        [new_expiry] + names
    )

    lines = [f"- {m.learned_context}" for m in matched]
    return (
        "\n\n🧠 ORGANISATIONAL MEMORY & LEARNED RULES "
        "(apply these always):\n" + "\n".join(lines)
    )


# ─────────────────────────────────────────────────────────────────────────────
# CAPTURE
# ─────────────────────────────────────────────────────────────────────────────

def capture_memory(
    category: str,
    learned_context: str,
    trigger_keywords: str = "",
    user: str = None,
    source: str = "Manual"
) -> str:
    """
    Create or re-enable an AI Memory for the current user.
    Deduplicates on exact learned_context + user match.
    Returns the doc name.
    """
    _user = user or frappe.session.user
    expiry = add_days(today(), _EXPIRY_DAYS)

    # Dedup: identical context for this user → just re-enable + reset expiry
    existing = frappe.get_all(
        "AI Memory",
        filters={"learned_context": learned_context, "user": _user},
        fields=["name"],
        limit=1
    )
    if existing:
        frappe.db.set_value("AI Memory", existing[0].name, {
            "enabled": 1,
            "confidence_score": 1.0,
            "expires_on": expiry,
        }, update_modified=False)
        frappe.db.commit()
        return existing[0].name

    doc = frappe.get_doc({
        "doctype": "AI Memory",
        "category": category,
        "scope": "User",
        "user": _user,
        "trigger_keywords": trigger_keywords,
        "learned_context": learned_context,
        "source": source,
        "confidence_score": 1.0,
        "enabled": 1,
        "expires_on": expiry,
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return doc.name


# ─────────────────────────────────────────────────────────────────────────────
# SELF-HEAL LOGGER
# ─────────────────────────────────────────────────────────────────────────────

def log_tool_failure(tool_name: str, failed_query: str, error: str,
                     fixed_query: str = None):
    """
    Auto-capture a SQL Fix memory when execute_sql_query fails.
    Silently skips if capture itself errors — never break the chat loop.
    """
    try:
        context = (
            f"AVOID THIS [{tool_name}]: Query «{failed_query[:150]}» "
            f"caused error «{error[:100]}»."
        )
        if fixed_query:
            context += f" Correct alternative: «{fixed_query[:200]}»"

        capture_memory(
            category="SQL Fix",
            learned_context=context,
            trigger_keywords=tool_name,
            source="Auto: Tool Failure"
        )
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# AUTO-CORRECTION DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

# Signal phrases that indicate the user is correcting the AI
_CORRECTION_SIGNALS = [
    "no,", "no ", "wrong", "incorrect", "not that", "that's wrong",
    "use instead", "use ", "actually", "i meant", "should be",
    "not from", "not in", "always use", "please use",
    # Marathi
    "नाही,", "चुकीचे", "असे नाही", "हे नाही",
    # Hindi
    "नहीं,", "गलत", "ऐसा नहीं", "यह नहीं",
]

_CORRECTION_KEYWORDS = [
    "warehouse", "wh-", "store", "godown", "branch", "plant",
    "supplier", "customer", "account", "format", "currency",
    "filter", "status", "column", "field",
    # Marathi / Hindi cognates
    "गोदाम", "शाखा", "प्लांट",
]


def maybe_auto_capture_correction(user_msg: str) -> bool:
    """
    Heuristic: if the user message looks like a correction (starts with a
    correction signal AND mentions an ERP entity keyword), auto-capture it
    as a User Preference memory.

    Returns True if a memory was captured.
    """
    msg_lower = user_msg.lower().strip()

    has_signal = any(msg_lower.startswith(s) or f" {s}" in msg_lower
                     for s in _CORRECTION_SIGNALS)
    has_keyword = any(k in msg_lower for k in _CORRECTION_KEYWORDS)

    if has_signal and has_keyword:
        try:
            capture_memory(
                category="User Preference",
                learned_context=user_msg.strip(),
                trigger_keywords=", ".join(
                    k for k in _CORRECTION_KEYWORDS if k in msg_lower
                ),
                source="Auto: User Correction"
            )
            return True
        except Exception:
            pass
    return False

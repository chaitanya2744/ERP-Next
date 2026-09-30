import os
import re
import requests
import frappe
from frappe.utils import nowdate, add_days
from custom_ui.custom_ui.ai_chat.budget import log_token_usage

JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
def get_jev_api_key():
    try:
        conf_val = frappe.conf.get("jev_api_key") if hasattr(frappe, "conf") and frappe.conf else None
    except Exception:
        conf_val = None
    return os.getenv("JEV_API_KEY") or conf_val or "apikey_2153796ebf47547745e9be43447d7896f359_f99fb92ac76509b231bce448bef6068cd4868510d023da1ad77ebded92be83f9"

JEV_API_KEY = get_jev_api_key()

# Supported draft actions across ERPNext modules
ACTION_PROFILES = {
    "quotation": {
        "doctype": "Quotation",
        "party_type": "customer",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "quotation",
        "party_prompt": "Which customer is this quotation for?"
    },
    "sales_order": {
        "doctype": "Sales Order",
        "party_type": "customer",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "sales-order",
        "party_prompt": "Which customer is this sales order for?"
    },
    "purchase_order": {
        "doctype": "Purchase Order",
        "party_type": "supplier",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "purchase-order",
        "party_prompt": "Which supplier is this purchase order for?"
    },
    "sales_invoice": {
        "doctype": "Sales Invoice",
        "party_type": "customer",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "sales-invoice",
        "party_prompt": "Which customer should I bill for this invoice?"
    },
    "purchase_invoice": {
        "doctype": "Purchase Invoice",
        "party_type": "supplier",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "purchase-invoice",
        "party_prompt": "Which supplier is this purchase invoice from?"
    },
    "material_request": {
        "doctype": "Material Request",
        "party_type": None,
        "requires_party": False,
        "requires_item": True,
        "requires_qty": True,
        "slug": "material-request",
        "party_prompt": None
    },
    "lead": {
        "doctype": "Lead",
        "party_type": "lead",
        "requires_party": True,
        "requires_item": False,
        "requires_qty": False,
        "slug": "lead",
        "party_prompt": "What is the name or company of the new lead?"
    },
    "opportunity": {
        "doctype": "Opportunity",
        "party_type": "customer",
        "requires_party": True,
        "requires_item": False,
        "requires_qty": False,
        "slug": "opportunity",
        "party_prompt": "Which customer or prospect is this opportunity for?"
    }
}

def evaluate_draft_intent(user_prompt: str):
    """
    Calls TypeSafe JEV System One model to evaluate if this is a draft creation
    intent across core ERPNext entities, checking slot completeness.
    """
    headers = {
        "Authorization": f"Bearer {JEV_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "jev-latest",
        "state": user_prompt,
        "questions": {
            "draft_action": {
                "type": "choice",
                "instructions": "Is the user requesting to create, prepare, or draft an ERPNext document or record?",
                "criteria": {
                    "quotation": "Draft or create a Quotation or Sales Quote for a customer",
                    "sales_order": "Draft or create a Sales Order for a customer",
                    "purchase_order": "Draft or create a Purchase Order for a supplier",
                    "sales_invoice": "Draft or create a Sales Invoice / Bill for a customer",
                    "purchase_invoice": "Draft or create a Purchase Invoice / Vendor Bill from a supplier",
                    "material_request": "Draft or create a Material Request / Purchase Indent for stock or items",
                    "lead": "Create, register, or add a new Sales Lead or Prospect",
                    "opportunity": "Create, register, or log a new Sales Opportunity or Deal",
                    "none": "Not a document draft creation request (e.g. analytics, queries, reports, or general chat)"
                }
            },
            "has_party": {
                "type": "noul",
                "instructions": "Does the prompt specify who the document is for (the customer, supplier, or lead name)?"
            },
            "has_item": {
                "type": "noul",
                "instructions": "Does the prompt specify an item, product, part name, or service?"
            },
            "has_qty": {
                "type": "noul",
                "instructions": "Does the prompt specify a quantity or number of units?"
            }
        }
    }

    try:
        r = requests.post(JEV_ENDPOINT, headers=headers, json=payload, timeout=4)
        if r.status_code == 200:
            data = r.json()
            ans = data.get("answers", {})
            usage = data.get("usage", {})

            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)
            if input_tokens > 0:
                try:
                    log_token_usage(
                        model_name="typesafe-jev",
                        prompt_tokens=input_tokens,
                        response_tokens=output_tokens,
                        api_method="router",
                        description=f"JEV Voice Slot Evaluator ({ans.get('draft_action', {}).get('choice', 'none')})"
                    )
                except Exception:
                    pass

            return {
                "draft_action": ans.get("draft_action", {}).get("choice", "none"),
                "has_party": bool(ans.get("has_party", {}).get("noul", 0.0) >= 0.5),
                "has_item": bool(ans.get("has_item", {}).get("noul", 0.0) >= 0.5),
                "has_qty": bool(ans.get("has_qty", {}).get("noul", 0.0) >= 0.5),
                "confidence": ans.get("draft_action", {}).get("confidence", 0.0)
            }
    except Exception as e:
        frappe.log_error(f"JEV Slot Evaluation Exception: {e}", "AI Voice Draft")

    return None

def find_party_in_db(text: str, party_type: str):
    if not party_type:
        return None
    if party_type == "lead":
        # Extract lead name from text (e.g., "new lead Acme Corp" -> Acme Corp)
        m = re.search(r'(?:lead|prospect|client)\s+(?:named|called|for)?\s*([A-Za-z0-9\s\.\-_]+)', text, re.I)
        if m:
            clean = m.group(1).strip()
            # remove common trailing words
            clean = re.sub(r'\b(interested in|for|with|phone|email)\b.*$', '', clean, flags=re.I).strip()
            return clean if len(clean) > 2 else text.strip()
        return text.strip()

    table = "tabCustomer" if party_type == "customer" else "tabSupplier"
    name_field = "customer_name" if party_type == "customer" else "supplier_name"
    rows = frappe.db.sql(f"SELECT name, {name_field} as p_name FROM `{table}` WHERE docstatus < 2", as_dict=True)
    text_lower = text.lower()
    for r in rows:
        p_name = r["p_name"].lower()
        clean = re.sub(r'\b(pvt|ltd|limited|corp|co|inc|projects|systems)\b', '', p_name).strip()
        words = [w for w in clean.split() if len(w) > 2]
        if words and all(w in text_lower for w in words):
            return r["name"]
    return None

def find_item_in_db(text: str):
    rows = frappe.db.sql("SELECT item_code, item_name, stock_uom FROM `tabItem` WHERE disabled = 0", as_dict=True)
    text_lower = text.lower()
    for r in rows:
        code = r["item_code"].lower()
        name = (r["item_name"] or "").lower()
        if code in text_lower or (name and name in text_lower):
            return r
    return None

def attempt_voice_draft(user_prompt: str, history: list):
    """
    Main Entrypoint: Triage slot-filling or ghost draft creation in sub-250ms across ERP entities.
    Returns reply string if handled, or None to fall back to Gemini.
    """
    # 1. Multi-turn Conversational Stitching for Slot-Filling
    stitched_prompt = user_prompt
    if len(history) >= 2:
        prev_assistant_msg = history[-2].get("content", "").lower()
        if any(prompt_hint in prev_assistant_msg for prompt_hint in ["which customer", "which supplier", "which item", "what quantity", "name or company"]):
            prev_user_req = history[-3].get("content", "") if len(history) >= 3 else ""
            stitched_prompt = f"{prev_user_req} {user_prompt}"

    # 2. Evaluate via JEV System One
    eval_res = evaluate_draft_intent(stitched_prompt)
    if not eval_res or eval_res["draft_action"] == "none":
        return None

    action = eval_res["draft_action"]
    profile = ACTION_PROFILES.get(action)
    if not profile:
        return None

    # 3. Slot-Filling Triage
    if profile["requires_party"] and not eval_res["has_party"]:
        return profile["party_prompt"]

    if profile["requires_item"] and not eval_res["has_item"]:
        return f"Which item or product should I include in this {profile['doctype']}?"

    if profile["requires_qty"] and not eval_res["has_qty"]:
        return f"What quantity should I specify for this {profile['doctype']}?"

    # 4. Ghost Draft Creation (All Required Slots Present)
    party_name = find_party_in_db(stitched_prompt, profile["party_type"]) if profile["requires_party"] else None
    item_info = find_item_in_db(stitched_prompt) if profile["requires_item"] else None

    if profile["requires_party"] and not party_name:
        # Fall back to Gemini for fuzzy entity matching or discovery
        return None

    if profile["requires_item"] and not item_info:
        # Fall back to Gemini
        return None

    # Extract Quantity
    qty = 1.0
    qty_m = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:litres|litre|units|bags|pcs|pieces|nos|kg|qty)?\b', stitched_prompt, re.I)
    if qty_m:
        try:
            qty = float(qty_m.group(1))
        except ValueError:
            qty = 1.0

    # Extract Rate (optional, defaults to 0 / standard price list)
    rate = 0.0
    rate_m = re.search(r'(?:@|at\s+(?:rate\s+)?|rate\s*(?:of)?|rs\.?|inr|rupees)\s*(\d+(?:\.\d+)?)', stitched_prompt, re.I)
    if not rate_m:
        rate_m = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr)\b', stitched_prompt, re.I)
    if rate_m:
        try:
            rate = float(rate_m.group(1))
        except ValueError:
            rate = 0.0

    try:
        doc = frappe.new_doc(profile["doctype"])
        sched = add_days(nowdate(), 7)

        if action == "quotation":
            doc.quotation_to = "Customer"
            doc.party_name = party_name
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "rate": rate
            })
        elif action == "sales_order":
            doc.customer = party_name
            doc.delivery_date = sched
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "rate": rate,
                "delivery_date": sched
            })
        elif action == "purchase_order":
            wh = frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
            doc.supplier = party_name
            doc.schedule_date = sched
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "rate": rate,
                "schedule_date": sched,
                "warehouse": wh
            })
        elif action == "sales_invoice":
            doc.customer = party_name
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "rate": rate
            })
        elif action == "purchase_invoice":
            doc.supplier = party_name
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "rate": rate
            })
        elif action == "material_request":
            wh = frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
            doc.material_request_type = "Purchase"
            doc.schedule_date = sched
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "schedule_date": sched,
                "warehouse": wh
            })
        elif action == "lead":
            doc.lead_name = party_name
            doc.status = "Lead"
        elif action == "opportunity":
            doc.opportunity_from = "Customer"
            doc.party_name = party_name
            if item_info:
                doc.append("items", {
                    "item_code": item_info["item_code"],
                    "qty": qty
                })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        grand_total = getattr(doc, "grand_total", qty * rate if rate > 0 else 0.0) or 0.0
        total_str = f" Total: ₹{grand_total:,.2f}." if grand_total > 0 else ""
        party_str = f" for **{party_name}**" if party_name else ""
        item_str = f" ({int(qty) if qty.is_integer() else qty} {item_info.get('stock_uom', 'units')} of {item_info['item_code']}{f' at ₹{rate:,.2f}' if rate > 0 else ''})" if item_info else ""

        reply = (
            f"✨ Done! I have created draft {doc.doctype} **{doc.name}**{party_str}{item_str}.{total_str}\n\n"
            f"👉 [Open {doc.name}](/app/{profile['slug']}/{doc.name})"
        )
        return reply

    except Exception as e:
        frappe.log_error(f"Failed to create voice draft document ({profile['doctype']}): {e}", "AI Voice Draft")
        # Graceful fallback to Gemini
        return None

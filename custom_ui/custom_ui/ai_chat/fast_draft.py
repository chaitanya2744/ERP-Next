import os
import re
import requests
import frappe
from frappe.utils import nowdate, add_days
from custom_ui.custom_ui.ai_chat.budget import log_token_usage
from custom_ui.custom_ui.ai_chat.tools import resolve_supplier, resolve_customer, resolve_item, resolve_warehouse, extract_date, extract_qty, transliterate_devanagari

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
        "rfq": {
        "doctype": "Request for Quotation",
        "party_type": "supplier",
        "requires_party": True,
        "requires_item": True,
        "requires_qty": True,
        "slug": "request-for-quotation",
        "party_prompt": "Which supplier is this RFQ for?"
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
                    "rfq": "Draft or create a Request for Quotation (RFQ) for a supplier or vendor",
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


def detect_language(text: str) -> str:
    if re.search(r'[\u0900-\u097F]', text):
        marathi_markers = ['आहे', 'नावाने', 'करा', 'करायची', 'करायचे', 'करावे', 'केले', 'आणि', 'मध्ये', 'पाहिजे', 'हवे', 'द्या', 'पाठवा', 'झाले', 'हो', 'कोर्टेशन', 'कोटेशन', 'रिटवेस्']
        if any(m in text for m in marathi_markers):
            return "mr"
        return "hi"
    return "en"

def is_existing_doc_action_or_query(text: str) -> bool:
    """
    Returns True if the prompt is an action on an existing document (submit, cancel, delete,
    update, email, print) or an inquiry/query/status check or an ordinal reference to a listed doc.
    These must NEVER be handled as new draft creations.
    """
    t = text.lower()

    # 1. Document Lifecycle & Workflow Actions
    workflow_markers = [
        "सबमिट", "submit", "दाखल", "जमा",
        "कॅन्सल", "cancel", "रद्द",
        "डिलीट", "delete", "काढून", "हटवा",
        "अपडेट", "update", "अमेंड", "amend", "बदला", "change",
        "पाठवा", "send", "ईमेल", "email", "मेल", "mail",
        "प्रिंट", "print", "डाऊनलोड", "download", "पीडीएफ", "pdf",
        "अ‍ॅप्रुव्ह", "approve", "कन्फर्म", "confirm"
    ]
    if any(m in t for m in workflow_markers):
        return True

    # 2. Ordinal or Index References to listed documents
    ordinal_markers = [
        "फर्स्ट", "पहिला", "पहिले", "पहिला वाला", "पहिलावाला", "पहिल्या", "first", "1st",
        "सेकंड", "दुसरा", "दुसरे", "दुसऱ्या", "second", "2nd",
        "थर्ड", "तिसरा", "third", "3rd",
        "लास्ट", "शेवटचा", "शेवटची", "शेवटचे", "last", "latest",
        "हे जे", "हा जो", "ही जी", "तो जो", "ती जी", "te je", "ha jo", "this one", "that one", "these"
    ]
    if any(m in t for m in ordinal_markers):
        return True

    # 3. Direct document naming pattern (e.g. PUR-RFQ-2026-00038, MAT-MR-, etc.)
    if re.search(r'\b[A-Z]{2,5}-[A-Z]{2,5}-\d{4}-\d+\b', text, re.I):
        return True

    # 4. Inquiries / Viewing / Showing / Listing / Status
    query_markers = [
        "दाखवा", "दाखव", "बघू", "बघा", "पाहू", "शोधा", "शोध", "सांगा", "सांग",
        "दिखाओ", "दिखाइए", "बताओ", "बताइए", "ढूंढो", "चेक करा", "check",
        "status", "स्टेटस", "लिस्ट", "list", "show", "view", "find",
        "केले", "केलेले", "झाले", "झालेले", "बनवला का", "बन गया", "बनाया", "बनाया था",
        "created", "was created", "already created", "did you create", "what was created"
    ]
    if any(m in t for m in query_markers):
        return True

    return False

# Backward compatibility alias
def is_past_tense_or_query(text: str) -> bool:
    return is_existing_doc_action_or_query(text)

DOC_LABELS = {
    "mr": {
        "Request for Quotation": "Request for Quotation (RFQ)",
        "Quotation": "कोटेशन (Quotation)",
        "Purchase Order": "परचेस ऑर्डर (Purchase Order)",
        "Sales Order": "सेल्स ऑर्डर (Sales Order)",
        "Sales Invoice": "सेल्स इन्व्हॉइस (Sales Invoice)",
        "Purchase Invoice": "परचेस इन्व्हॉइस (Purchase Invoice)",
        "Material Request": "मटेरिअल रिक्वेस्ट (Material Request)",
        "Lead": "लीड (Lead)",
        "Opportunity": "ऑपर्च्युनिटी (Opportunity)"
    },
    "hi": {
        "Request for Quotation": "Request for Quotation (RFQ)",
        "Quotation": "कोटेशन (Quotation)",
        "Purchase Order": "परचेस ऑर्डर (Purchase Order)",
        "Sales Order": "सेल्स ऑर्डर (Sales Order)",
        "Sales Invoice": "सेल्स इनवॉइस (Sales Invoice)",
        "Purchase Invoice": "परचेस इनवॉइस (Purchase Invoice)",
        "Material Request": "मटीरियल रिक्वेस्ट (Material Request)",
        "Lead": "लीड (Lead)",
        "Opportunity": "ऑपर्चुनिटी (Opportunity)"
    }
}

PARTY_PROMPTS = {
    "mr": {
        "rfq": "हा RFQ कोणत्या सप्लायरसाठी तयार करायचा आहे?",
        "quotation": "हे कोटेशन कोणत्या कस्टमरसाठी तयार करायचे आहे?",
        "purchase_order": "हा परचेस ऑर्डर कोणत्या सप्लायरसाठी तयार करायचा आहे?",
        "sales_order": "हा सेल्स ऑर्डर कोणत्या कस्टमरसाठी तयार करायचा आहे?",
        "sales_invoice": "हे सेल्स इन्व्हॉइस कोणत्या कस्टमरच्या नावाने बनवायचे आहे?",
        "purchase_invoice": "हे परचेस इन्व्हॉइस कोणत्या सप्लायरचे आहे?",
        "lead": "नवीन लीडचे नाव किंवा कंपनी काय आहे?",
        "opportunity": "ही ऑपर्च्युनिटी कोणत्या कस्टमरसाठी आहे?"
    },
    "hi": {
        "rfq": "यह RFQ किस सप्लायर के लिए बनाना है?",
        "quotation": "यह कोटेशन किस कस्टमर के लिए बनाना है?",
        "purchase_order": "यह परचेस ऑर्डर किस सप्लायर के लिए बनाना है?",
        "sales_order": "यह सेल्स ऑर्डर किस कस्टमर के लिए बनाना है?",
        "sales_invoice": "यह सेल्स इनवॉइस किस कस्टमर के लिए बनाना है?",
        "purchase_invoice": "यह परचेस इनवॉइस किस सप्लायर का है?",
        "lead": "नए लीड का नाम या कंपनी क्या है?",
        "opportunity": "यह ऑपर्चुनिटी किस कस्टमर के लिए है?"
    }
}

def find_party_in_db(text: str, party_type: str):
    if not party_type:
        return None
    if party_type == "supplier":
        return resolve_supplier(text)
    elif party_type == "customer":
        return resolve_customer(text)
    elif party_type == "lead":
        m = re.search(r'(?:lead|prospect|client)\s+(?:named|called|for)?\s*([A-Za-z0-9\s\.\-_]+)', text, re.I)
        if m:
            clean = m.group(1).strip()
            clean = re.sub(r'(interested in|for|with|phone|email).*$', '', clean, flags=re.I).strip()
            return clean if len(clean) > 2 else text.strip()
        return text.strip()
    return None

def find_item_in_db(text: str):
    return resolve_item(text)

def attempt_voice_draft(user_prompt: str, history: list, voice_gender: str = "female"):
    """
    Main Entrypoint: Triage slot-filling or ghost draft creation in sub-250ms across ERP entities.
    Returns reply string if handled, or None to fall back to Gemini.
    """
    # 0. Fast-exit if inquiry, status check, or existing document action (submit, cancel, update, ordinal select)
    if is_existing_doc_action_or_query(user_prompt):
        return None

    # Check if preceding assistant turn just concluded a doc creation
    if history and len(history) >= 2:
        prev_asst = history[-2].get("content", "").lower()
        if any(marker in prev_asst for marker in ["तयार झाली आहे", "done! i have created draft", "/app/"]):
            if len(user_prompt.split()) <= 7:
                return None

    # 1. Multi-turn Conversational Stitching for Slot-Filling
    stitched_prompt = user_prompt
    if len(history) >= 2:
        prev_assistant_msg = history[-2].get("content", "").lower()
        if any(prompt_hint in prev_assistant_msg for prompt_hint in [
            "which customer", "which supplier", "which item", "what quantity", "name or company",
            "कोणत्या सप्लायरसाठी", "कोणत्या कस्टमरसाठी", "कोणती वस्तू", "किती प्रमाण",
            "किस सप्लायर", "किस कस्टमर", "कौन सा आइटम", "कितनी क्वांटिटी"
        ]):
            prev_user_req = history[-3].get("content", "") if len(history) >= 3 else ""
            stitched_prompt = f"{prev_user_req} {user_prompt}"

    # Check if stitched prompt has existing doc action
    if is_existing_doc_action_or_query(stitched_prompt):
        return None

    # Augment stitched prompt with Devanagari transliteration for entity detection
    lookup_text = stitched_prompt + " " + transliterate_devanagari(stitched_prompt)

    # 2. Evaluate via JEV System One
    eval_res = evaluate_draft_intent(lookup_text)
    if not eval_res or eval_res["draft_action"] == "none":
        return None

    action = eval_res["draft_action"]
    profile = ACTION_PROFILES.get(action)
    if not profile:
        return None

    # Detect user language (mr, hi, or en)
    lang = detect_language(stitched_prompt)
    doc_label = DOC_LABELS.get(lang, {}).get(profile["doctype"], profile["doctype"])

    # 3. Database Ground-Truth Slot Detection
    party_name = find_party_in_db(lookup_text, profile["party_type"]) if profile["requires_party"] else None
    item_info = find_item_in_db(lookup_text) if profile["requires_item"] else None

    has_party = bool(party_name) or eval_res["has_party"]
    has_item = bool(item_info) or eval_res["has_item"]
    has_qty = eval_res["has_qty"] or bool(re.search(r'\b\d+(?:\.\d+)?\b', stitched_prompt))

    # Slot-Filling Triage with language-aware questions
    if profile["requires_party"] and not has_party:
        return PARTY_PROMPTS.get(lang, {}).get(action) or profile["party_prompt"]

    if profile["requires_item"] and not has_item:
        if lang == "mr":
            return f"या {doc_label} मध्ये कोणती वस्तू (Item) समाविष्ट करायची आहे?"
        elif lang == "hi":
            return f"इस {doc_label} में कौन सा आइटम शामिल करना है?"
        return f"Which item or product should I include in this {profile['doctype']}?"

    if profile["requires_qty"] and not has_qty:
        if lang == "mr":
            return f"या {doc_label} साठी किती प्रमाण (Quantity) हवे आहे?"
        elif lang == "hi":
            return f"इस {doc_label} के लिए कितनी क्वांटिटी चाहिए?"
        return f"What quantity should I specify for this {profile['doctype']}?"

    # 4. Ghost Draft Creation (All Required Slots Present)
    if profile["requires_party"] and not party_name:
        return None

    if profile["requires_item"] and not item_info:
        return None

    sched, matched_date_str = extract_date(lookup_text)
    qty = extract_qty(lookup_text, matched_date_str)

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
        elif action == "rfq":
            wh = resolve_warehouse(lookup_text)
            doc.company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
            doc.transaction_date = nowdate()
            doc.subject = f"Request for Quotation for {item_info['item_code']}"
            doc.append("suppliers", {
                "supplier": party_name
            })
            stock_uom = item_info.get("stock_uom", "Nos")
            doc.append("items", {
                "item_code": item_info["item_code"],
                "qty": qty,
                "uom": stock_uom,
                "stock_uom": stock_uom,
                "conversion_factor": 1.0,
                "schedule_date": sched,
                "warehouse": wh if item_info.get("is_stock_item") else None
            })
        elif action == "purchase_order":
            wh = resolve_warehouse(lookup_text)
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
            wh = resolve_warehouse(lookup_text)
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
        
        # Localized confirmation
        if lang == "mr":
            party_str = f" **{party_name}** साठी" if party_name else ""
            item_str = f" ({int(qty) if qty.is_integer() else qty} {item_info.get('stock_uom', 'units')} of {item_info['item_code']})" if item_info else ""
            reply = (
                f"✨ तुमची {doc_label} **{doc.name}** यशस्वीरित्या तयार झाली आहे ({party_str}{item_str}).\n\n"
                f"👉 [Open {doc.name}](/app/{profile['slug']}/{doc.name})"
            )
        elif lang == "hi":
            party_str = f" **{party_name}** के लिए" if party_name else ""
            item_str = f" ({int(qty) if qty.is_integer() else qty} {item_info.get('stock_uom', 'units')} of {item_info['item_code']})" if item_info else ""
            reply = (
                f"✨ आपकी {doc_label} **{doc.name}** सफलतापूर्वक तैयार हो गई है ({party_str}{item_str}).\n\n"
                f"👉 [Open {doc.name}](/app/{profile['slug']}/{doc.name})"
            )
        else:
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

import difflib
import re

import frappe

from custom_ui.custom_ui.ai_chat.toolkit.transliteration import transliterate_devanagari


def resolve_supplier(text_or_name):
    if not text_or_name:
        return None
    raw = str(text_or_name).strip()
    if frappe.db.exists("Supplier", raw):
        return raw
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    rows = frappe.db.sql("SELECT name, supplier_name FROM `tabSupplier` WHERE docstatus < 2", as_dict=True)
    text_lower = raw.lower()

    # 1. Exact or substring match
    for r in rows:
        n_l = r["name"].lower()
        sn_l = (r["supplier_name"] or "").lower()
        if n_l == text_lower or sn_l == text_lower:
            return r["name"]
        if n_l in text_lower or (sn_l and sn_l in text_lower):
            return r["name"]

    # 2. Fuzzy token scoring
    text_words = [w for w in re.findall(r'[a-zA-Z0-9]+', text_lower) if len(w) > 1]
    best_match = None
    best_score = 0.0

    for r in rows:
        n_l = r["name"].lower()
        r_words = [w for w in re.findall(r'[a-zA-Z0-9]+', n_l) if len(w) > 1 and w not in {'pvt', 'ltd', 'limited', 'corp', 'co', 'inc', 'supplies', 'supplier', 'suppliers', 'vendor'}]
        if not r_words:
            continue

        matched_score = 0.0
        for rw in r_words:
            best_rw_match = 0.0
            for tw in text_words:
                if rw == tw:
                    best_rw_match = 1.0
                    break
                elif rw.startswith(tw) or tw.startswith(rw):
                    sim = len(min(rw, tw, key=len)) / len(max(rw, tw, key=len))
                    if sim > best_rw_match:
                        best_rw_match = sim
                else:
                    ratio = difflib.SequenceMatcher(None, rw, tw).ratio()
                    if ratio >= 0.75 and ratio > best_rw_match:
                        best_rw_match = ratio
            matched_score += best_rw_match

        total_score = matched_score / len(r_words)
        total_score += matched_score * 0.5

        for i in range(len(text_lower) - len(n_l) + 5):
            sub = text_lower[max(0, i):i + len(n_l) + 2]
            ratio = difflib.SequenceMatcher(None, n_l, sub).ratio()
            if ratio > 0.8:
                total_score += ratio

        if total_score > best_score:
            best_score = total_score
            best_match = r["name"]

    return best_match


def resolve_customer(text_or_name):
    if not text_or_name:
        return None
    raw = str(text_or_name).strip()
    if frappe.db.exists("Customer", raw):
        return raw
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    rows = frappe.db.sql("SELECT name, customer_name FROM `tabCustomer` WHERE docstatus < 2", as_dict=True)
    text_lower = raw.lower()

    for r in rows:
        n_l = r["name"].lower()
        cn_l = (r["customer_name"] or "").lower()
        if n_l == text_lower or cn_l == text_lower:
            return r["name"]
        if n_l in text_lower or (cn_l and cn_l in text_lower):
            return r["name"]

    text_words = [w for w in re.findall(r'[a-zA-Z0-9]+', text_lower) if len(w) > 1]
    best_match = None
    best_score = 0.0

    for r in rows:
        n_l = r["name"].lower()
        r_words = [w for w in re.findall(r'[a-zA-Z0-9]+', n_l) if len(w) > 1 and w not in {'pvt', 'ltd', 'limited', 'corp', 'co', 'inc', 'customer', 'client'}]
        if not r_words:
            continue

        matched_score = 0.0
        for rw in r_words:
            best_rw_match = 0.0
            for tw in text_words:
                if rw == tw:
                    best_rw_match = 1.0
                    break
                elif rw.startswith(tw) or tw.startswith(rw):
                    sim = len(min(rw, tw, key=len)) / len(max(rw, tw, key=len))
                    if sim > best_rw_match:
                        best_rw_match = sim
                else:
                    ratio = difflib.SequenceMatcher(None, rw, tw).ratio()
                    if ratio >= 0.75 and ratio > best_rw_match:
                        best_rw_match = ratio
            matched_score += best_rw_match

        total_score = matched_score / len(r_words)
        total_score += matched_score * 0.5

        if total_score > best_score:
            best_score = total_score
            best_match = r["name"]

    return best_match


def resolve_item(text_or_code):
    if not text_or_code:
        return None
    raw = str(text_or_code).strip()
    if frappe.db.exists("Item", raw):
        return frappe.db.get_value("Item", raw, ["item_code", "item_name", "stock_uom", "is_stock_item"], as_dict=True)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    rows = frappe.db.sql("SELECT item_code, item_name, stock_uom, is_stock_item FROM `tabItem` WHERE disabled = 0", as_dict=True)
    text_lower = raw.lower()

    for r in rows:
        c_l = r["item_code"].lower()
        n_l = (r["item_name"] or "").lower()
        if c_l == text_lower or n_l == text_lower:
            return r
        if c_l in text_lower or (n_l and n_l in text_lower):
            return r

    text_words = [w for w in re.findall(r'[a-zA-Z]+', text_lower) if len(w) > 1 and w not in {'till', 'oct', 'on', 'rawmaterial', 'warehuose', 'warehouse', 'quanitty', 'quantity', 'units', 'kg', 'nos', 'for', 'the', 'item'}]
    best_match = None
    best_score = 0.0

    for r in rows:
        n_l = (r["item_name"] or r["item_code"]).lower()
        it_tokens = [w for w in re.findall(r'[a-zA-Z]+', n_l) if len(w) > 1 and w not in {'type', 'grade', 'standard'}]
        if not it_tokens:
            continue

        matched_tokens = 0
        for tok in it_tokens:
            if tok in text_words:
                matched_tokens += 1
            else:
                for tw in text_words:
                    if difflib.SequenceMatcher(None, tok, tw).ratio() >= 0.8:
                        matched_tokens += 1
                        break

        coverage = matched_tokens / len(it_tokens)
        if coverage >= 0.8:
            score = coverage * 2.0 + matched_tokens
            if score > best_score:
                best_score = score
                best_match = r

    return best_match


def resolve_warehouse(text):
    if not text:
        return frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
    raw = str(text).strip()
    if frappe.db.exists("Warehouse", raw):
        return raw
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    rows = frappe.db.sql("SELECT name, warehouse_name FROM `tabWarehouse` WHERE is_group = 0 AND disabled = 0", as_dict=True)
    text_lower = raw.lower()
    for r in rows:
        if r["name"].lower() in text_lower or r["warehouse_name"].lower() in text_lower:
            return r["name"]

    text_clean = re.sub(r'[^a-zA-Z0-9]', '', text_lower)
    best_w = None
    best_score = 0.0
    for r in rows:
        w_clean = re.sub(r'[^a-zA-Z0-9]', '', r["warehouse_name"].lower())
        ratio = difflib.SequenceMatcher(None, w_clean, text_clean).ratio()
        w_words = set(re.findall(r'[a-zA-Z]+', r["warehouse_name"].lower()))
        t_words = set(re.findall(r'[a-zA-Z]+', text_lower))
        score = ratio + len(w_words & t_words)
        if "raw" in text_lower and "raw" in r["warehouse_name"].lower():
            score += 2.0
        if score > best_score:
            best_score = score
            best_w = r["name"]

    return best_w or frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")

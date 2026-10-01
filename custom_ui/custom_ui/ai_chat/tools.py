import difflib
import re
import frappe
from frappe.utils import add_days, getdate, nowdate


DEV_MAP = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'z', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'r': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'gy',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    'ॅ': 'a', 'ॉ': 'o', 'ः': 'h', '्': '', '़': '',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri'
}

def transliterate_devanagari(text: str) -> str:
    if not text or not re.search(r'[\u0900-\u097F]', text):
        return text or ""
    t = text
    t = t.replace('सोल्यूशन्स', 'solutions')
    t = t.replace('सोल्युशन्स', 'solutions')
    t = t.replace('सोल्यूशन', 'solution')
    t = t.replace('झेनिथ', 'zenith')
    t = t.replace('रेझिन', 'resin')
    t = t.replace('रेसीन', 'resin')
    t = t.replace('रेझ्यूम', 'resin')
    t = t.replace('इपॉक्सी', 'epoxy')
    t = t.replace('बायपॉक्सी', 'epoxy')
    t = t.replace('डिपॉक्सी', 'epoxy')
    t = t.replace('चाकण', 'chakan')
    t = t.replace('भोसरी', 'bhosari')
    t = t.replace('लिटर्स', 'litres')
    t = t.replace('लिटर', 'litre')
    t = t.replace('ऑक्टोबर', 'october')
    t = t.replace('आरएफक्यू', 'rfq')
    t = t.replace('आर एफ क्यू', 'rfq')
    t = t.replace('कोटेशन', 'quotation')
    t = t.replace('कोर्टेशन', 'quotation')
    t = t.replace('रिटवेस्', 'request')
    t = t.replace('रिक्वेस्ट', 'request')
    res = []
    for ch in t:
        if ch in DEV_MAP:
            res.append(DEV_MAP[ch])
        else:
            res.append(ch)
    return "".join(res)


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


def extract_date(text):
    if not text:
        return str(add_days(nowdate(), 7)), ""
    raw = str(text)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    months = r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
    date_pat = rf'(?:(?:till|by|before|on|date|schedule)\s*[:=]?\s*)?(\b\d{{1,2}}(?:st|nd|rd|th)?\s+{months}\s+\d{{4}}\b|\b{months}\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}}\b|\b\d{{4}}-\d{{2}}-\d{{2}}\b|\b\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{4}}\b)'
    m = re.search(date_pat, raw, re.I)
    if m:
        try:
            raw_d = re.sub(r'(st|nd|rd|th)', '', m.group(1))
            return str(getdate(raw_d)), m.group(0)
        except Exception:
            pass
    return str(add_days(nowdate(), 7)), ""


def extract_qty(text, matched_date_str=""):
    clean = text
    if matched_date_str:
        clean = clean.replace(matched_date_str, " ")
    clean = re.sub(r'202\d', ' ', clean)
    m = re.search(r'(?:qty|quantity|quanitty|units|nos|pcs|bags)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:litres|litre|units|bags|pcs|pieces|nos|kg|qty|quantity|quanitty)?', clean, re.I)
    if m:
        try:
            return float(m.group(1))
        except Exception:
            pass
    return 1.0


def normalize_document_data(doctype, data):
    if not isinstance(data, dict):
        return data

    if doctype == "Request for Quotation":
        raw_supplier = None
        if "supplier" in data and "suppliers" not in data:
            raw_supplier = data.pop("supplier")
        elif "vendor" in data and "suppliers" not in data:
            raw_supplier = data.pop("vendor")

        if raw_supplier:
            if isinstance(raw_supplier, list):
                resolved_list = []
                for s in raw_supplier:
                    s_name = s if isinstance(s, str) else (s.get("supplier") if isinstance(s, dict) else "")
                    match = resolve_supplier(s_name) or s_name
                    resolved_list.append({"supplier": match})
                data["suppliers"] = resolved_list
            else:
                match = resolve_supplier(raw_supplier) or raw_supplier
                data["suppliers"] = [{"supplier": match}]
        elif "suppliers" in data and isinstance(data["suppliers"], list):
            for row in data["suppliers"]:
                if isinstance(row, dict) and "supplier" in row:
                    match = resolve_supplier(row["supplier"])
                    if match:
                        row["supplier"] = match
                elif isinstance(row, str):
                    match = resolve_supplier(row)
                    row = {"supplier": match or row}

        if "items" not in data:
            if "item_code" in data or "item" in data:
                item_code = data.pop("item_code", None) or data.pop("item", None)
                qty = data.pop("qty", 1)
                wh_hint = data.pop("warehouse", None)
                sched_hint = data.get("schedule_date")
                new_row = {"item_code": item_code, "qty": qty}
                if wh_hint:
                    new_row["warehouse"] = wh_hint
                if sched_hint:
                    new_row["schedule_date"] = sched_hint
                data["items"] = [new_row]

        if not data.get("company"):
            data["company"] = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")

        if not data.get("transaction_date"):
            data["transaction_date"] = frappe.utils.nowdate()
        else:
            p_td, _ = extract_date(str(data["transaction_date"]))
            if p_td:
                data["transaction_date"] = p_td

        if data.get("schedule_date"):
            p_sd, _ = extract_date(str(data["schedule_date"]))
            if p_sd:
                data["schedule_date"] = p_sd

        default_wh = frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
        default_sched = frappe.utils.add_days(frappe.utils.nowdate(), 7)

        for item_row in data.get("items", []):
            code = item_row.get("item_code") or item_row.get("item")
            item_doc = resolve_item(code) if code else None
            if item_doc:
                item_row["item_code"] = item_doc.get("item_code")
                if not item_row.get("uom"):
                    item_row["uom"] = item_doc.get("stock_uom", "Nos")
                if not item_row.get("stock_uom"):
                    item_row["stock_uom"] = item_doc.get("stock_uom", "Nos")
                if not item_row.get("conversion_factor"):
                    item_row["conversion_factor"] = 1.0
                wh_hint = item_row.get("warehouse")
                item_row["warehouse"] = resolve_warehouse(wh_hint)
            else:
                if not item_row.get("conversion_factor"):
                    item_row["conversion_factor"] = 1.0
                wh_hint = item_row.get("warehouse")
                item_row["warehouse"] = resolve_warehouse(wh_hint)

            raw_sched = item_row.get("schedule_date")
            if raw_sched:
                parsed_d, _ = extract_date(str(raw_sched))
                item_row["schedule_date"] = parsed_d or default_sched
            else:
                item_row["schedule_date"] = default_sched

        if not data.get("subject"):
            first_item = data.get("items", [{}])[0].get("item_code", "Materials")
            data["subject"] = f"Request for Quotation for {first_item}"

    elif doctype == "Purchase Order":
        default_wh = frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
        default_sched = frappe.utils.add_days(frappe.utils.nowdate(), 7)
        if "supplier" in data:
            data["supplier"] = resolve_supplier(data["supplier"]) or data["supplier"]
        if not data.get("schedule_date"):
            data["schedule_date"] = default_sched
        for item_row in data.get("items", []):
            code = item_row.get("item_code") or item_row.get("item")
            item_doc = resolve_item(code) if code else None
            if item_doc:
                item_row["item_code"] = item_doc.get("item_code")
                if not item_row.get("uom"):
                    item_row["uom"] = item_doc.get("stock_uom", "Nos")
            if not item_row.get("schedule_date"):
                item_row["schedule_date"] = default_sched
            if not item_row.get("warehouse"):
                wh_hint = item_row.get("warehouse")
                item_row["warehouse"] = resolve_warehouse(wh_hint) if wh_hint else default_wh

    return data


def execute_tool(name, args):
    try:
        if name == "get_documents":
            doctype = args.get("doctype")
            filters = args.get("filters") or {}
            limit = args.get("limit") or 20
            # Fetch with all fields
            res = frappe.get_list(doctype, filters=filters, limit=limit, fields=["*"])
            return {"output": res}

        elif name == "get_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            doc = frappe.get_doc(doctype, docname)
            return {"output": doc.as_dict()}

        elif name == "create_document":
            doctype = args.get("doctype")
            data = normalize_document_data(doctype, args.get("data") or {})
            doc = frappe.get_doc(dict(doctype=doctype, **data))
            doc.insert()
            frappe.db.commit()
            return {"output": {"status": "Success", "name": doc.name, "doc": doc.as_dict()}}

        elif name == "update_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            data = args.get("data")
            doc = frappe.get_doc(doctype, docname)
            doc.update(data)
            doc.save()
            frappe.db.commit()
            return {"output": {"status": "Success", "name": doc.name, "doc": doc.as_dict()}}

        elif name == "delete_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            frappe.delete_doc(doctype, docname)
            frappe.db.commit()
            return {"output": {"status": "Success", "message": f"Deleted {doctype} {docname}"}}

        elif name == "execute_document_method":
            doctype = args.get("doctype")
            docname = args.get("name")
            method = args.get("method")
            method_args = args.get("args") or {}
            
            doc = frappe.get_doc(doctype, docname)
            if method == "submit":
                result = doc.submit()
            elif method == "cancel":
                result = doc.cancel()
            else:
                result = doc.run_method(method, **method_args)
            frappe.db.commit()
            return {"output": {"status": "Success", "method": method, "result": result}}

        elif name == "send_email":
            recipients = args.get("recipients")
            subject = args.get("subject")
            message = args.get("message")
            reference_doctype = args.get("reference_doctype")
            reference_name = args.get("reference_name")
            
            # Convert AI markdown to HTML so tables, bolds, etc render correctly in the email
            html_message = frappe.utils.md_to_html(message) if message else ""
            
            # frappe.sendmail natively handles queueing, creating Communication, and linking
            frappe.sendmail(
                recipients=recipients,
                subject=subject,
                message=html_message,
                reference_doctype=reference_doctype,
                reference_name=reference_name
            )
            frappe.db.commit()
            return {"output": {"status": "Success", "message": "Email has been sent and added to the Email Queue."}}

        elif name == "execute_frappe_report":
            report_name = args.get("report_name")
            filters = args.get("filters") or {}
            
            # Auto-map filters for financial statements to avoid mandatory fields errors
            if report_name in ["Profit and Loss Statement", "Balance Sheet", "Cash Flow Statement"]:
                if "from_date" in filters and "period_start_date" not in filters:
                    filters["period_start_date"] = filters.pop("from_date")
                if "to_date" in filters and "period_end_date" not in filters:
                    filters["period_end_date"] = filters.pop("to_date")
                if "filter_based_on" not in filters:
                    filters["filter_based_on"] = "Date Range"
                if "periodicity" not in filters:
                    filters["periodicity"] = "Yearly"

            from frappe.desk.query_report import run
            res = run(report_name, filters=filters)
            
            # Helper to truncate results
            def truncate_res(data):
                if isinstance(data, list) and len(data) > 150:
                    # Keep the first 150 rows, but if there's a grand total at the end, we might lose it.
                    # It's better than crashing the AI.
                    return data[:150]
                return data

            if isinstance(res, dict):
                return {"output": {"columns": res.get("columns"), "result": truncate_res(res.get("result"))}}
            elif isinstance(res, tuple) and len(res) >= 2:
                return {"output": {"columns": res[0], "result": truncate_res(res[1])}}
            else:
                return {"output": str(res)[:10000]}

        elif name == "describe_doctype":
            doctype = args.get("doctype")
            if not doctype or not frappe.db.exists("DocType", doctype):
                return {"error": f"DocType '{doctype}' does not exist in ERPNext."}

            meta = frappe.get_meta(doctype)
            mandatory_fields = []
            key_optional_fields = []
            child_tables = []

            for df in meta.fields:
                if df.fieldtype in ["Section Break", "Column Break", "Tab Break", "HTML", "Heading"]:
                    continue

                finfo = {
                    "fieldname": df.fieldname,
                    "label": df.label,
                    "fieldtype": df.fieldtype,
                    "options": df.options,
                    "reqd": bool(df.reqd)
                }

                if df.fieldtype == "Table":
                    try:
                        child_meta = frappe.get_meta(df.options)
                        child_mandatory = []
                        for cdf in child_meta.fields:
                            if cdf.reqd and cdf.fieldtype not in ["Section Break", "Column Break", "Tab Break"]:
                                child_mandatory.append({
                                    "fieldname": cdf.fieldname,
                                    "label": cdf.label,
                                    "fieldtype": cdf.fieldtype,
                                    "options": cdf.options
                                })
                        child_tables.append({
                            "fieldname": df.fieldname,
                            "label": df.label,
                            "child_doctype": df.options,
                            "mandatory_fields": child_mandatory
                        })
                    except Exception:
                        child_tables.append({
                            "fieldname": df.fieldname,
                            "label": df.label,
                            "child_doctype": df.options,
                            "mandatory_fields": []
                        })
                elif df.reqd:
                    mandatory_fields.append(finfo)
                elif df.fieldtype in ["Link", "Select"] or df.fieldname in ["status", "posting_date", "transaction_date", "company"]:
                    key_optional_fields.append(finfo)

            prerequisites_map = {
                "Production Plan": "Prerequisites: Finished Goods Item(s) with an active submitted 'BOM'. If item has no active BOM, a Production Plan cannot be created! Child table 'po_items' (or 'items') requires 'item_code', 'bom_no', and 'planned_qty'.",
                "Work Order": "Prerequisites: 'production_item' (Item) with an active 'bom_no' (BOM), 'qty', 'wip_warehouse', and 'fg_warehouse'.",
                "BOM": "Prerequisites: 'item' (Finished Goods item, is_stock_item=1). In child table 'items', raw material items with 'qty' and 'uom'.",
                "Sales Order": "Prerequisites: 'customer' (Customer DocType) and in child table 'items', valid 'item_code' and 'delivery_date'.",
                "Sales Invoice": "Prerequisites: 'customer', in child table 'items', valid 'item_code', and valid income account.",
                "Purchase Order": "Prerequisites: 'supplier' (Supplier DocType) and in child table 'items', valid 'item_code' and 'schedule_date'.",
                "Purchase Invoice": "Prerequisites: 'supplier', in child table 'items', valid 'item_code', and expense account.",
                "Material Request": "Prerequisites: In child table 'items', valid 'item_code' and 'schedule_date'.",
                "Stock Entry": "Prerequisites: 'purpose'. If 'Manufacture', requires 'work_order' and 'bom_no'."
            }

            return {
                "output": {
                    "doctype": doctype,
                    "is_submittable": bool(meta.is_submittable),
                    "mandatory_fields": mandatory_fields,
                    "important_optional_fields": key_optional_fields[:15],
                    "child_tables": child_tables,
                    "workflow_prerequisite_hint": prerequisites_map.get(doctype, "Verify linked Link fields and child tables exist before calling create_document.")
                }
            }

        elif name == "execute_sql_query":
            query = args.get("query", "").strip()
            if not query.lower().startswith("select"):
                return {"error": "Only SELECT queries are allowed for security reasons."}
            import re
            query = re.sub(r'(?<!`)\b(tab[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)+)\b(?!`)', r'`\1`', query)
            res = frappe.db.sql(query, as_dict=True)
            return {"output": res}

        else:
            return {"error": f"Tool {name} not found"}
    except Exception as e:
        frappe.log_error(title=f"AI Tool Exec Error: {name}", message=frappe.get_traceback())
        return {"error": str(e)}

import frappe

from custom_ui.custom_ui.ai_chat.toolkit.parsing import extract_date
from custom_ui.custom_ui.ai_chat.toolkit.resolvers import (
    resolve_item,
    resolve_supplier,
    resolve_warehouse,
)


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

import re
import frappe

from custom_ui.custom_ui.ai_chat.toolkit.normalizers import normalize_document_data


def _is_user_permitted_for_module(module_name: str) -> bool:
    """Check if the current session user has access to the module."""
    if not module_name:
        return True
    user = frappe.session.user
    if user in ["Administrator", "root"]:
        return True
    try:
        from frappe.utils.modules import get_modules_from_all_apps_for_user
        allowed_modules = [m.get("module_name") for m in get_modules_from_all_apps_for_user(user)]
        return module_name in allowed_modules
    except Exception:
        # Fallback: check if module is in user's blocked modules
        try:
            blocked = frappe.get_cached_doc("User", user).get_blocked_modules()
            return module_name not in blocked
        except Exception:
            return True


def _get_doctypes_from_sql(query: str) -> list[str]:
    """Extract Frappe DocTypes referenced in a SELECT query."""
    clean = re.sub(r"--.*?$|/\*.*?\*/", " ", query, flags=re.MULTILINE)
    clean = re.sub(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"", " ", clean)
    matches = re.findall(r"(?:from|join)\s+(?:`([^`]+)`|([a-zA-Z0-9_]+))", clean, flags=re.IGNORECASE)
    doctypes = []
    for m in matches:
        raw_table = (m[0] or m[1]).strip()
        if raw_table.startswith("tab"):
            doctypes.append(raw_table[3:])
        elif frappe.db.exists("DocType", raw_table):
            doctypes.append(raw_table)
    return list(dict.fromkeys(doctypes))


def execute_tool(name, args):
    try:
        if name == "get_documents":
            doctype = args.get("doctype")
            if not doctype or not frappe.has_permission(doctype, ptype="read"):
                return {"error": f"Permission Denied: You do not have permission to view {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

            filters = args.get("filters") or {}
            limit = args.get("limit") or 20
            res = frappe.get_list(doctype, filters=filters, limit=limit, fields=["*"])
            return {"output": res}

        elif name == "get_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            if not doctype or not frappe.has_permission(doctype, ptype="read"):
                return {"error": f"Permission Denied: You do not have permission to view {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

            doc = frappe.get_doc(doctype, docname)
            doc.check_permission("read")
            return {"output": doc.as_dict()}

        elif name == "create_document":
            doctype = args.get("doctype")
            if not doctype or not frappe.has_permission(doctype, ptype="create"):
                return {"error": f"Permission Denied: You do not have permission to create {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

            data = normalize_document_data(doctype, args.get("data") or {})
            doc = frappe.get_doc(dict(doctype=doctype, **data))
            doc.insert(ignore_permissions=False)
            frappe.db.commit()
            return {"output": {"status": "Success", "name": doc.name, "doc": doc.as_dict()}}

        elif name == "update_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            if not doctype or not frappe.has_permission(doctype, ptype="write"):
                return {"error": f"Permission Denied: You do not have permission to update {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

            data = args.get("data") or {}
            doc = frappe.get_doc(doctype, docname)
            doc.check_permission("write")
            doc.update(data)
            doc.save(ignore_permissions=False)
            frappe.db.commit()
            return {"output": {"status": "Success", "name": doc.name, "doc": doc.as_dict()}}

        elif name == "delete_document":
            doctype = args.get("doctype")
            docname = args.get("name")
            if not doctype or not frappe.has_permission(doctype, ptype="delete"):
                return {"error": f"Permission Denied: You do not have permission to delete {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

            doc = frappe.get_doc(doctype, docname)
            doc.check_permission("delete")
            frappe.delete_doc(doctype, docname, ignore_permissions=False)
            frappe.db.commit()
            return {"output": {"status": "Success", "message": f"Deleted {doctype} {docname}"}}

        elif name == "execute_document_method":
            doctype = args.get("doctype")
            docname = args.get("name")
            method = args.get("method")
            method_args = args.get("args") or {}

            doc = frappe.get_doc(doctype, docname)
            if method == "submit":
                if not frappe.has_permission(doctype, ptype="submit", doc=doc):
                    return {"error": f"Permission Denied: You do not have permission to submit {doctype} {docname}."}
                doc.check_permission("submit")
                result = doc.submit()
            elif method == "cancel":
                if not frappe.has_permission(doctype, ptype="cancel", doc=doc):
                    return {"error": f"Permission Denied: You do not have permission to cancel {doctype} {docname}."}
                doc.check_permission("cancel")
                result = doc.cancel()
            else:
                doc.check_permission("write")
                result = doc.run_method(method, **method_args)
            frappe.db.commit()
            return {"output": {"status": "Success", "method": method, "result": result}}

        elif name == "send_email":
            recipients = args.get("recipients")
            subject = args.get("subject")
            message = args.get("message")
            reference_doctype = args.get("reference_doctype")
            reference_name = args.get("reference_name")

            if reference_doctype:
                if not frappe.has_permission(reference_doctype, ptype="read"):
                    return {"error": f"Permission Denied: You do not have permission to access {reference_doctype}."}

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

            if not frappe.has_permission("Report", ptype="read"):
                return {"error": "Permission Denied: You do not have permission to access reports."}

            ref_doctype = frappe.db.get_value("Report", report_name, "ref_doctype")
            if ref_doctype and not frappe.has_permission(ref_doctype, ptype="report"):
                return {"error": f"Permission Denied: You do not have permission to view reports for {ref_doctype}."}

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

            if not frappe.has_permission(doctype, ptype="read"):
                return {"error": f"Permission Denied: You do not have permission to view schema for {doctype}."}

            module = frappe.db.get_value("DocType", doctype, "module")
            if module and not _is_user_permitted_for_module(module):
                return {"error": f"Permission Denied: Access to module '{module}' is restricted for your account."}

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

            # Enforce module and DocType permission checks for all referenced tables in SQL
            referenced_doctypes = _get_doctypes_from_sql(query)
            for dt in referenced_doctypes:
                if not frappe.has_permission(dt, ptype="read"):
                    return {"error": f"Permission Denied: You do not have permission to query DocType '{dt}'."}

                dt_module = frappe.db.get_value("DocType", dt, "module")
                if dt_module and not _is_user_permitted_for_module(dt_module):
                    return {"error": f"Permission Denied: Access to module '{dt_module}' (for '{dt}') is restricted for your account."}

            query = re.sub(r'(?<!`)\b(tab[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)+)\b(?!`)', r'`\1`', query)
            res = frappe.db.sql(query, as_dict=True)
            return {"output": res}

        else:
            return {"error": f"Tool {name} not found"}
    except Exception as e:
        frappe.log_error(title=f"AI Tool Exec Error: {name}", message=frappe.get_traceback())
        return {"error": str(e)}

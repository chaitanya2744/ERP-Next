import frappe

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
            data = args.get("data")
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
            res = frappe.db.sql(query, as_dict=True)
            return {"output": res}

        else:
            return {"error": f"Tool {name} not found"}
    except Exception as e:
        frappe.log_error(title=f"AI Tool Exec Error: {name}", message=frappe.get_traceback())
        return {"error": str(e)}

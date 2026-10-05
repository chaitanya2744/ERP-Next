GEMINI_TOOLS = [
    {
        "functionDeclarations": [
            {
                "name": "describe_doctype",
                "description": "Inspect the schema, mandatory fields, child tables, and workflow prerequisites of any ERPNext DocType before creating or updating documents. Always use this when creating or preparing documents to ensure all required fields and child tables are known.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name to inspect (e.g., 'Production Plan', 'Work Order', 'BOM', 'Sales Order')"}
                    },
                    "required": ["doctype"]
                }
            },
            {
                "name": "get_documents",
                "description": "Retrieve a list of documents for a specific DocType (e.g., Customer, Item, Sales Order) with optional filters.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name (e.g. Customer, Item, Sales Order)"},
                        "filters": {"type": "OBJECT", "description": "Filters as key-value pairs (e.g. {'status': 'Draft'}) (optional)"},
                        "limit": {"type": "INTEGER", "description": "Max documents to return (default: 20) (optional)"}
                    },
                    "required": ["doctype"]
                }
            },
            {
                "name": "get_document",
                "description": "Retrieve details of a single document by DocType and Name/ID (including all fields and table rows).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name"},
                        "name": {"type": "STRING", "description": "The document name/ID (e.g. SO-2026-00001)"}
                    },
                    "required": ["doctype", "name"]
                }
            },
            {
                "name": "create_document",
                "description": "Create a new document in ERPNext (e.g., Sales Order, Purchase Order). Note: For Sales Orders and Purchase Orders, you must supply the 'warehouse' field inside each row of the 'items' list (e.g., {'item_code': 'MAR-011-S0', 'qty': 1, 'warehouse': 'Finished Goods Store - SFPL'}).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name"},
                        "data": {"type": "OBJECT", "description": "Fields and child tables for the new document"}
                    },
                    "required": ["doctype", "data"]
                }
            },
            {
                "name": "update_document",
                "description": "Update an existing document in ERPNext.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name"},
                        "name": {"type": "STRING", "description": "The document name/ID"},
                        "data": {"type": "OBJECT", "description": "Fields to update"}
                    },
                    "required": ["doctype", "name", "data"]
                }
            },
            {
                "name": "delete_document",
                "description": "Delete a document in ERPNext.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name"},
                        "name": {"type": "STRING", "description": "The document name/ID"}
                    },
                    "required": ["doctype", "name"]
                }
            },
            {
                "name": "execute_frappe_report",
                "description": "Execute a standard Frappe Report and get the result. Example reports: 'General Ledger', 'Stock Balance', 'Sales Analytics'.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "report_name": {"type": "STRING", "description": "Name of the report (e.g. 'Stock Balance')"},
                        "filters": {"type": "OBJECT", "description": "Filters for the report as key-value pairs (e.g. {'company': 'Your Company', 'from_date': '2026-01-01'})"}
                    },
                    "required": ["report_name"]
                }
            },
            {
                "name": "execute_sql_query",
                "description": "Execute a raw SQL SELECT query for custom analytics. MUST ONLY BE A SELECT QUERY.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING", "description": "The raw SQL SELECT query (e.g. 'SELECT item_code, sum(qty) FROM `tabStock Ledger Entry` GROUP BY item_code')"},
                        "target_doctype": {"type": "STRING", "description": "The primary DocType being accessed (e.g. 'Sales Order', 'Stock Ledger Entry')"}
                    },
                    "required": ["query", "target_doctype"]
                }
            },
            {
                "name": "execute_document_method",
                "description": "Execute a specific backend method on an existing document (e.g., 'send' to send a Communication, 'submit' to submit an invoice).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "doctype": {"type": "STRING", "description": "The DocType name"},
                        "name": {"type": "STRING", "description": "The document name/ID"},
                        "method": {"type": "STRING", "description": "The method to execute (e.g., 'send', 'submit', 'cancel')"},
                        "args": {"type": "OBJECT", "description": "Optional keyword arguments for the method"}
                    },
                    "required": ["doctype", "name", "method"]
                }
            },
            {
                "name": "send_email",
                "description": "Send an email. This correctly adds the email to the Frappe Email Queue and creates the Communication record.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "recipients": {"type": "STRING", "description": "Comma-separated list of email addresses"},
                        "subject": {"type": "STRING", "description": "Email subject"},
                        "message": {"type": "STRING", "description": "Email body content (HTML allowed)"},
                        "reference_doctype": {"type": "STRING", "description": "DocType this email relates to (e.g., 'Purchase Order')"},
                        "reference_name": {"type": "STRING", "description": "Document name this email relates to (e.g., 'PUR-ORD-2026-00490')"}
                    },
                    "required": ["recipients", "subject", "message"]
                }
            }
        ]
    }
]

GEMINI_MODEL = "gemini-3.1-flash-lite"          # fast + smart, free tier available

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={api_key}"
)

MAX_TOKENS  = 8192
MAX_HISTORY = 20   # keep last N messages to avoid token overflow

SYSTEM_PROMPT = """You are an AI assistant embedded inside ERPNext, an open-source ERP system built on Frappe Framework.

Your job is to help users:
- Query and understand their ERPNext data (invoices, orders, stock, customers, suppliers, reports)
- Perform actions like creating or updating documents
- Explain ERPNext concepts and workflows
- Summarise reports and financial data

Rules:
- Be concise and direct. Users are busy business operators.
- NEVER perform mathematical calculations yourself. LLMs hallucinate math. If the user asks for a total, average, or sum, you MUST write a SQL query using SUM(), AVG(), or use execute_frappe_report. The database is 100% accurate; you are just the translator.
- Always display financial figures exactly as returned by the database. Do not round numbers. Use exactly 2 decimal places and the correct currency symbol.
- When the user asks for "reporting" or any kind of report, data analysis, trends, or comparisons, you MUST show visual reports. Generate an interactive chart to visualize the information. Output a valid JSON configuration for Frappe Charts enclosed EXACTLY within ```chart and ``` markdown blocks.
  You MUST ALSO provide a brief text summary or a small markdown table (e.g. top 5 results) IN ADDITION to the chart, so the user can read the data directly.
  Example Format:
  ```chart
  {{
    "title": "Chart Title",
    "data": {{ "labels": ["A", "B"], "datasets": [{{ "name": "Val", "values": [10, 20] }}] }},
    "type": "bar"
  }}
  ```
  Allowed types: bar, line, pie, percentage, donut. DO NOT wrap the chart block in any other code blocks.
- When showing secondary data or if a chart is impossible, use markdown tables where it helps readability.
- TWO-PHASE ANALYTICS EXECUTION PROTOCOL (Gather in Turn 1 ➔ Analyze & Answer in Turn 2):
  For reporting, bottleneck analysis, performance reviews, lead times, variances, or multi-module analytics:
  1. PHASE 1 (GATHER - Exactly 1 Turn):
     * NEVER call `describe_doctype` or `get_documents` iteratively in loops for analytical queries.
     * Gather all needed data in ONE consolidated tool call:
       - Either call `execute_frappe_report` if a standard report exists, OR
       - Call `execute_sql_query` with a single comprehensive SQL query utilizing appropriate JOINs, WHERE date filters, aggregations (AVG, SUM, COUNT), and GROUP BY.
       - COMMON TABLE LINKAGES:
         * Work Order & Work Centers: Join `tabJob Card` (fields: `work_order`, `work_center`, `total_time_in_mins`, `operation`, `status`) with `tabWork Order` (fields: `name`, `production_item`, `planned_start_date`, `actual_start_date`, `actual_end_date`, `status`, `bom_no`).
         * Accounts Receivable Aging: Query `tabSales Invoice` (fields: `name`, `customer`, `posting_date`, `due_date`, `outstanding_amount`, `grand_total`) WHERE `outstanding_amount > 0`.
         * Supplier Spend: Query `tabPurchase Invoice` (fields: `supplier`, `posting_date`, `grand_total`) GROUP BY `supplier`.
         * Dead / Slow Stock: Prefer `execute_frappe_report('Stock Ageing')` or query `tabStock Ledger Entry` joined with `tabBin`.
  2. PHASE 2 (SYNTHESIZE, CHART & DELIVER - Turn 2):
     * Once the data returns from the database tool, IMMEDIATELY formulate and return your final response.
     * Deliver the core business insight, a compact markdown summary table (e.g. top 3 or top 5 results), and an interactive ```chart JSON block.
     * DO NOT initiate additional investigative tool calls. Complete the entire response within these 2 turns.

- If you don't have access to live data, use the database query tools available to retrieve it.
- When you need to fetch complex analytics, totals, or grouped data, FIRST try to use `execute_frappe_report` with standard ERPNext reports (like 'Accounts Receivable', 'Stock Balance', 'General Ledger', 'Sales Analytics').
- If the data cannot be fetched via standard reports, you may use `execute_sql_query` to write a custom SELECT query.
- Never use `execute_sql_query` for data modification.
- DOCUMENT CREATION & ERPNEXT WORKFLOW PROTOCOL:
  When a user asks to create or prepare any transaction or master document in ERPNext:
  1. NEVER call `create_document` blindly without verifying schema and prerequisite documents!
  2. STEP 1 (Inspect Schema & Requirements):
     - If you are not 100% certain of the mandatory fields or child table structure for the requested DocType, call `describe_doctype` first to inspect the schema.
  3. STEP 2 (Verify Upstream Prerequisites in Database):
     - Check if prerequisite master records and upstream documents already exist before attempting to create downstream documents.
     - For 'Production Plan':
       * Check if the Finished Goods Item exists in ERPNext.
       * Check if an active default 'BOM' exists for that Item:
         Query: `get_documents` on 'BOM' with filters `{{"item": item_code, "is_active": 1, "is_default": 1, "docstatus": 1}}`.
       * IF NO ACTIVE BOM EXISTS: DO NOT attempt to create the Production Plan! STOP and inform the user:
         "In ERPNext, a Production Plan requires an active Bill of Materials (BOM) for the item. Item '[item_code]' does not have an active BOM. Would you like me to create the BOM first?"
     - For 'Work Order':
       * Must have a valid `production_item` and submitted `bom_no`. If no BOM exists, ask to create the BOM first.
     - For 'BOM' (Bill of Materials):
       * Must have the parent item and raw material items defined with quantities.
     - For 'Sales Order' / 'Sales Invoice':
       * Must have a valid `customer`. If the customer does not exist in ERPNext, query or ask to create the Customer first.
       * Items must exist in ERPNext.
     - For 'Purchase Order' / 'Purchase Invoice':
       * Must have a valid `supplier`. If supplier does not exist, ask to create the Supplier first.
     - For 'Stock Entry' (Manufacture):
       * Requires an existing submitted Work Order.
  4. STEP 3 (Proactive Guidance & Dependency Resolution):
     - If any prerequisite records are missing, explain the ERPNext dependency chain clearly to the user, and offer to create them in the correct sequential order (e.g. Items ➔ BOM ➔ Production Plan ➔ Work Orders).
  5. STEP 4 (Accurate Child Table Construction):
     - When creating documents with child tables (like `items` or `po_items`), ensure all mandatory child fields (e.g., `item_code`, `qty`, `rate`, `bom_no`, `warehouse`) are properly provided inside the child array.
- To trigger backend workflows on an existing document (e.g. submitting an Invoice, or canceling a document), use the `execute_document_method` tool.
- To send an email, ALWAYS use the `send_email` tool. DO NOT use `create_document` for the `Communication` DocType, as that bypasses the mailer.
- Always respond in the same language the user writes in.
- Never make up data. If you don't know, say so.
- CONTEXT HINT (Branches): In this ERPNext instance, "Branches" (e.g. Bhosari Plant, Chakan Plant, Vellore Plant, Nalagarh Plant) are tracked via the `cost_center` field on transaction items (e.g. `Sales Invoice Item`, `Purchase Invoice Item`, `GL Entry`). If the user asks for branch-wise sales or expenses, you MUST join the item table and group by `cost_center`.

- MODULE & CROSS-MODULAR SCHEMA RELATIONSHIPS & EXACT MARIADB RECIPES:
  * CRITICAL NAMING IN ERPNEXT:
    - Work Centers are called 'Workstation' (Table: `tabWorkstation`, NOT `tabWork Center`).
    - In `tabJob Card`, the column is `workstation` (NOT work_center).
    - In `tabWork Order`, planned vs actual dates: `planned_start_date`, `planned_end_date`, `actual_start_date`, `actual_end_date`, `lead_time`.
    - BOM consumption is in `tabWork Order Item` (`required_qty`, `consumed_qty`, `source_warehouse`).

  * EXACT JOIN RECIPES:
    1. Work-Order & Workstation Bottleneck Analysis:
       SELECT jc.workstation, COUNT(jc.name) as total_jobs,
              AVG(CASE WHEN jc.actual_end_date IS NOT NULL AND jc.expected_end_date IS NOT NULL
                       THEN TIMESTAMPDIFF(MINUTE, jc.expected_end_date, jc.actual_end_date)
                       ELSE (jc.total_time_in_mins - jc.time_required) END) as avg_delay_mins
       FROM `tabJob Card` jc
       WHERE jc.creation >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       GROUP BY jc.workstation ORDER BY avg_delay_mins DESC LIMIT 3;

    2. Lead-to-Cash (L2C) Cycle:
       - Sales Order: `tabSales Order` (so)
       - Link SO to Delivery Note: JOIN `tabDelivery Note Item` dni ON so.name = dni.against_sales_order, JOIN `tabDelivery Note` dn ON dni.parent = dn.name
       - Link SO to Sales Invoice: JOIN `tabSales Invoice Item` sii ON so.name = sii.sales_order, JOIN `tabSales Invoice` si ON sii.parent = si.name
       - Link Invoice to Payment: JOIN `tabPayment Entry Reference` per ON per.reference_doctype = 'Sales Invoice' AND per.reference_name = si.name, JOIN `tabPayment Entry` pe ON per.parent = pe.name
       - Customer group is `so.customer_group`.
       - Delivery delay = DATEDIFF(dn.posting_date, so.transaction_date).
       - Payment delay = DATEDIFF(pe.posting_date, si.posting_date).

    3. Vendor Performance & 360 Scorecard:
       - PO: `tabPurchase Order` (po)
       - Receipt: `tabPurchase Receipt Item` pri ON po.name = pri.purchase_order, `tabPurchase Receipt` pr ON pri.parent = pr.name
       - QC: `tabQuality Inspection` qi ON qi.reference_name = pr.name (or qi.reference_name = po.name)
       - Invoice: `tabPurchase Invoice Item` pii ON po.name = pii.purchase_order

    4. Engineer-to-Order EVM:
       - Project: `tabProject` (name, estimated_cost, project_name)
       - Timesheets: `tabTimesheet Detail` td ON td.project = p.name
       - Invoices: `tabPurchase Invoice Item` pii ON pii.project = p.name
       - Work Orders: `tabWork Order` wo ON wo.project = p.name

    5. Accounts Receivable Aging:
       - `tabSales Invoice` WHERE outstanding_amount > 0 and docstatus = 1.
       - Overdue days = DATEDIFF(CURDATE(), due_date).

    6. Stock Aging & Dead Stock:
       - Prefer `execute_frappe_report` with report_name='Stock Ageing'.
       - For dead stock: `tabStock Ledger Entry` grouped by item_code having MAX(posting_date) < DATE_SUB(CURDATE(), INTERVAL 12 MONTH).

Current ERPNext context:
- Company: {company}
- Logged-in user: {user}
- Date: {today}
"""

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

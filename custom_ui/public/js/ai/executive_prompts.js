frappe.provide("custom_ui.ai");

(function () {
  "use strict";

  custom_ui.ai.executivePrompts = [
    // ── 1. Manufacturing ──
    {
      id: "mfg-bottleneck",
      module: "Manufacturing",
      icon: "🏭",
      title: "Work-Order Bottleneck & Delay Adherence",
      desc: "Top 3 work centers delaying output & variance vs planned lead time.",
      prompt: "Review Work Orders, BOM (Bill of Materials) consumption, and Operation times for the last [3 months]. Identify the top 3 work centers causing production delays and calculate their average variance against planned lead times.",
      chart: "📊 Bar Variance",
      type: "Deep Analytical"
    },
    {
      id: "mfg-shortage",
      module: "Manufacturing",
      icon: "🏭",
      title: "Proactive Material Shortage & Readiness Check",
      desc: "Cross-reference Production Plans with stock and POs to flag raw material risks.",
      prompt: "Analyze upcoming Production Plans and active Material Requests. Cross-reference them with current warehouse stock levels and active purchase orders to flag raw material shortages that could risk next week's delivery commitments.",
      chart: "⚠️ Shortage Grid",
      type: "Operational Alert"
    },

    // ── 2. Accounting ──
    {
      id: "acc-spend-discount",
      module: "Accounting",
      icon: "💰",
      title: "Supplier Spend & Missed Early Discounts",
      desc: "Audit top 10 suppliers by spend & flag missed early-payment discounts.",
      prompt: "Analyze our top 10 suppliers by spend over the last [12 months] and flag any instances where we missed early-payment discounts.",
      chart: "🍩 Spend Donut",
      type: "Financial Audit"
    },
    {
      id: "acc-aging-invoices",
      module: "Accounting",
      icon: "💰",
      title: "Aging Invoices Follow-up & Collection Drafts",
      desc: "Identify receivables > 60 days overdue & draft collection emails.",
      prompt: "Identify all accounts receivable invoices that are more than [60 days] overdue and draft a personalized collection email for each client.",
      chart: "📋 Overdue Buckets",
      type: "Actionable"
    },

    // ── 3. Assets ──
    {
      id: "ast-depreciation",
      module: "Assets",
      icon: "🏢",
      title: "Asset Depreciation Tracking & Book Value",
      desc: "Straight-line book value of IT hardware and assets reaching zero this year.",
      prompt: "Calculate the current book value of all company-owned IT hardware using the straight-line depreciation method and highlight assets reaching zero value this year.",
      chart: "📈 Asset Curve",
      type: "Valuation"
    },
    {
      id: "ast-ghost-audit",
      module: "Assets",
      icon: "🏢",
      title: "Ghost Software License & Utilization Audit",
      desc: "Cross-reference software license inventory with employee activity logs.",
      prompt: "Cross-reference our active software license inventory with employee active directory logs to find paid licenses that haven't been used in the last [90 days].",
      chart: "🔍 Unused Licenses",
      type: "Cost Leak"
    },

    // ── 4. Buying ──
    {
      id: "buy-vendor-perf",
      module: "Buying",
      icon: "🛒",
      title: "Vendor Performance & Price Variance Analysis",
      desc: "Delivery delays, quality rejections, and price variances by supplier.",
      prompt: "Review Purchase Orders, Material Receipts, and Supplier Quotations from the past year. Identify suppliers with the highest rate of delivery delays, quality rejections, and material cost variances, and rank them by overall reliability score.",
      chart: "🏆 Reliability Score",
      type: "Procurement"
    },
    {
      id: "buy-spend-consolidation",
      module: "Buying",
      icon: "🛒",
      title: "Spend Analysis & Volume Discount Consolidation",
      desc: "Identify small-batch purchases and estimate bulk consolidation savings.",
      prompt: "Review historical purchase history grouped by item groups and suppliers over the last [6 months]. Identify categories where we are making frequent small-batch purchases instead of bulk orders, and calculate potential cost savings if we consolidate suppliers.",
      chart: "💡 Bulk Savings",
      type: "Optimization"
    },

    // ── 5. CRM ──
    {
      id: "crm-funnel-leak",
      module: "CRM",
      icon: "🤝",
      title: "Sales Pipeline Funnel & Stage Drop-Off Leakage",
      desc: "Pinpoint stages with highest drop-off and conversion bottlenecks.",
      prompt: "Review data Lead and Opportunity stages over the past [6 months]. Identify the specific pipeline stages where we suffer the highest drop-off or stagnation rates, and suggest actionable strategies to accelerate conversions.",
      chart: "📉 Funnel Conversion",
      type: "Pipeline"
    },
    {
      id: "crm-icp-profile",
      module: "CRM",
      icon: "🤝",
      title: "High-Value Customer Profiling & Buying Patterns",
      desc: "Profile repeat high-value clients by order frequency and sales cycle.",
      prompt: "Analyze closed-won opportunities, customer quotation histories, and communication logs in CRM. Build a behavioral profile of our highest-value, repeat clients, highlighting common industry types, order frequencies, and average sales cycles.",
      chart: "👑 ICP Profile",
      type: "Strategic"
    },

    // ── 6. Projects ──
    {
      id: "prj-milestones",
      module: "Projects",
      icon: "📐",
      title: "Milestone & Critical Path Bottleneck Detection",
      desc: "Compare progress against baseline and identify tasks with > 2-week delay.",
      prompt: "Compare the current progress of [Project X] against its baseline timeline and pinpoint which specific tasks are causing more than [2-week delay].",
      chart: "⏱️ Gantt Variance",
      type: "Timeline"
    },
    {
      id: "prj-evm",
      module: "Projects",
      icon: "📐",
      title: "Earned Value Management (EVM) for Custom Manufacturing",
      desc: "Calculate CV, SV, CPI, and SPI from Timesheets, POs, and task budgets.",
      prompt: "Analyze active Projects involving custom manufacturing (Engineer-to-Order). Compare planned task budgets against actual costs drawn from linked Material Requests, Purchase Orders, and Timesheets. Calculate the Cost Variance (CV) and Schedule Variance (SV) for each milestone to flag projects trending toward budget overruns.",
      chart: "📊 EVM Metrics",
      type: "Deep Analytical"
    },

    // ── 7. Quality ──
    {
      id: "qty-inprocess-trend",
      module: "Quality",
      icon: "🔬",
      title: "In-Process Quality Trend & Defect Correlation",
      desc: "Correlate machine operators, shifts, and work centers with defect rates.",
      prompt: "Review in-process Quality Inspection templates and rejection logs linked to Work Orders. Identify any correlations between specific machine operators, shifts, or work centers and elevated defect rates.",
      chart: "🔍 Defect Heatmap",
      type: "Root-Cause"
    },
    {
      id: "qty-inspection-lag",
      module: "Quality",
      icon: "🔬",
      title: "Inspection Compliance & Inspection Lag Analysis",
      desc: "Measure lag between arrival and QC submission to eliminate bottlenecks.",
      prompt: "Analyze the time lag between when a material arrives (or a manufacturing batch finishes) and when the corresponding Quality Inspection is actually submitted. Highlight any testing bottlenecks or items lingering in 'Inspection Pending' status.",
      chart: "⏳ QC Lag Hours",
      type: "Process"
    },

    // ── 8. Selling ──
    {
      id: "sel-churn-risk",
      module: "Selling",
      icon: "📈",
      title: "Customer Churn & Purchase Frequency Risk",
      desc: "Identify clients whose order frequency dropped by > 30% vs prior year.",
      prompt: "Review historical Sales Orders and Customer master data. Identify active clients whose order frequency has dropped by more than [30%] over the last two quarters compared to the previous year, and flag them as potential churn risks.",
      chart: "🚨 Churn Matrix",
      type: "Retention"
    },
    {
      id: "sel-fulfillment-lag",
      module: "Selling",
      icon: "📈",
      title: "Sales Velocity & Order Lead-Time Bottlenecks",
      desc: "Average time from Order Creation to Delivery by Customer Group & Item.",
      prompt: "Using our Sales Order and Delivery Note data for the last [2 quarters], analyze the average time gap between Sales Order Creation and Actual Delivery. Group the delays by Customer Group and Item Code, identify the top 3 bottlenecks causing fulfillment lag, and recommend actionable adjustments for our dispatch planning.",
      chart: "⚡ Order-to-Delivery",
      type: "Velocity"
    },

    // ── 9. Stock ──
    {
      id: "stk-dead-stock",
      module: "Stock",
      icon: "📦",
      title: "Slow-Moving & Dead Stock Capital Identification",
      desc: "Zero outward movement items in 12 months & capital locked by warehouse.",
      prompt: "Review Stock Ledger Entries and Bin balances over the last [12 months]. Identify slow-moving or dead stock items that have had zero outward movement, and calculate the total capital locked up in these items by warehouse.",
      chart: "💰 Locked Capital",
      type: "Inventory Audit"
    },
    {
      id: "stk-aging-breakdown",
      module: "Stock",
      icon: "📦",
      title: "Dead Stock & Inventory Aging Breakdown",
      desc: "Stock aging in 0-30, 31-90, 91-180, 180+ day buckets & liquidation tactics.",
      prompt: "Using the Stock Ageing report data, categorize our current warehouse inventory into 0-30 days, 31-90 days, 91-180 days, and 180+ days buckets. Calculate the total capital locked in stagnant raw materials and finished goods, and suggest targeted liquidation strategies or BOM alternatives to absorb slow-moving components.",
      chart: "📊 Ageing Buckets",
      type: "Optimization"
    },

    // ── 10. Subcontracting ──
    {
      id: "sub-wip-tracking",
      module: "Subcontracting",
      icon: "🔨",
      title: "WIP Tracking at Subcontractor Units",
      desc: "Raw materials at job-work vendors past expected window without receipt.",
      prompt: "Examine stock balances currently lying in designated Subcontracting Warehouses. Identify raw materials that have been sitting at third-party locations beyond the expected processing window without generating a finished goods receipt.",
      chart: "🏭 Subcontractor WIP",
      type: "Vendor Audit"
    },
    {
      id: "sub-cost-arbitrage",
      module: "Subcontracting",
      icon: "🔨",
      title: "Out-Processing vs In-House Manufacturing Cost Arbitrage",
      desc: "Job-work charges + transport + scrap vs in-house BOM and Job Card costs.",
      prompt: "Compare the total landed cost of subcontracted operations (job-work charges + material transport + scrap loss) against estimated in-house manufacturing costs using ERPNext BOM and Job Card data. Identify items where outsourcing is financially inefficient and recommend internal production strategies.",
      chart: "⚖️ Make vs Buy Cost",
      type: "Cost Arbitrage"
    },

    // ── 11. Cross-Modular (360° Enterprise Flows) ──
    {
      id: "cross-lead-to-cash",
      module: "360° Cross",
      icon: "🌐",
      is_cross: true,
      cross_trail: ["CRM", "Selling", "Stock", "Accounting"],
      title: "Lead-to-Cash Cycle & Margin Leakage",
      desc: "End-to-end velocity from Opportunity to Delivery and Payment Entry.",
      prompt: "Perform a Lead-to-Cash cycle analysis for the last [6 months]. Measure the time elapsed from Opportunity creation to Sales Order, Delivery Note, and final Payment Entry. Identify which customer groups experience the longest payment delays and where order fulfillment gets blocked.",
      chart: "📈 L2C Funnel & DSO",
      type: "Enterprise 360°"
    },
    {
      id: "cross-vendor-360",
      module: "360° Cross",
      icon: "🌐",
      is_cross: true,
      cross_trail: ["Buying", "Quality", "Accounting", "Subcontracting"],
      title: "Integrated Vendor 360° Reliability & Quality Scorecard",
      desc: "Delivery punctuality, QC rejections, and price variance by vendor.",
      prompt: "Generate an integrated Vendor 360 Scorecard for our top 15 suppliers over the last [1 year]. Combine on-time delivery rates from Purchase Receipts and Subcontracting Receipts, quality inspection rejection percentages, invoice price variances against purchase orders, and payment terms compliance.",
      chart: "🏆 360° Supplier Radar",
      type: "Enterprise 360°"
    },
    {
      id: "cross-eto-evm",
      module: "360° Cross",
      icon: "🌐",
      is_cross: true,
      cross_trail: ["Projects", "Manufacturing", "Buying", "Accounting"],
      title: "Engineer-to-Order EVM & Cost Overrun Warning",
      desc: "Unified labour, PO expenses, and Work Order costs vs project budgets.",
      prompt: "For active Engineer-to-Order projects, calculate Earned Value metrics (PV, EV, AC, CPI, SPI). Aggregate actual labour costs from Timesheets, raw material expenses from linked Purchase Invoices, and in-house production costs from Work Orders. Flag any project where actual cost exceeds budget by more than [10%].",
      chart: "📊 ETO Cost & Schedule",
      type: "Enterprise 360°"
    },
    {
      id: "cross-shortage-alert",
      module: "360° Cross",
      icon: "🌐",
      is_cross: true,
      cross_trail: ["Selling", "Manufacturing", "Stock", "Buying"],
      title: "Shortage-Driven Assembly Alert & Expedited POs",
      desc: "Cross-reference committed dispatches with BOM exploded stock & PO ETAs.",
      prompt: "Cross-reference all confirmed Sales Orders scheduled for dispatch in the next [30 days] with active Work Orders, BOM explosion requirements, current warehouse Bin balances, and pending Purchase Orders. Generate an urgent shortage alert for any component that will halt assembly.",
      chart: "⚠️ Shortage Impact Grid",
      type: "Enterprise 360°"
    },
    {
      id: "cross-make-or-buy",
      module: "360° Cross",
      icon: "🌐",
      is_cross: true,
      cross_trail: ["Subcontracting", "Stock", "Manufacturing", "Accounting"],
      title: "Subcontracting vs In-House Make-or-Buy Matrix",
      desc: "Audit job-work landed costs against internal workstation BOM economics.",
      prompt: "Audit all subcontracted items over the last [6 months]. Compare total job work charges plus logistics and scrap allowance against standard in-house BOM manufacturing cost (raw materials + workstation operating cost + electricity). Highlight items that should immediately be brought in-house to maximize gross margin.",
      chart: "⚖️ Landed Cost Differential",
      type: "Enterprise 360°"
    }
  ];

  // Ribbon Module Categories with pre-computed counts
  custom_ui.ai.executiveModuleTabs = [
    { key: "Manufacturing", label: "Manufacturing", icon: "🏭" },
    { key: "Accounting", label: "Accounting", icon: "💰" },
    { key: "Buying", label: "Buying", icon: "🛒" },
    { key: "Selling", label: "Selling", icon: "📈" },
    { key: "Stock", label: "Stock", icon: "📦" },
    { key: "Projects", label: "Projects", icon: "📐" },
    { key: "Quality", label: "Quality", icon: "🔬" },
    { key: "CRM", label: "CRM", icon: "🤝" },
    { key: "Assets", label: "Assets", icon: "🏢" },
    { key: "Subcontracting", label: "Subcontracting", icon: "🔨" },
    { key: "360° Cross", label: "360° Cross-Modular", icon: "🌐", is_cross: true },
  ];

})();

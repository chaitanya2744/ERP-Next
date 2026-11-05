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
    },

    // ── 12. Employee Self-Service: Check-in & Attendance ──
    {
      id: "emp-checkin-in",
      module: "Attendance",
      icon: "⏱️",
      title: "Daily Check-In",
      desc: "Record your arrival timestamp and mark check-in for today.",
      prompt: "Check me in for today.",
      chart: "⏱️ Timestamp Log",
      type: "Quick Action"
    },
    {
      id: "emp-checkin-out",
      module: "Attendance",
      icon: "⏱️",
      title: "Daily Check-Out",
      desc: "Record your departure timestamp and mark check-out for today.",
      prompt: "Check me out for the day.",
      chart: "⏱️ Timestamp Log",
      type: "Quick Action"
    },
    {
      id: "emp-checkin-today",
      module: "Attendance",
      icon: "⏱️",
      title: "Today's Check-in Log & Hours",
      desc: "View your IN/OUT timestamps today and calculated working hours.",
      prompt: "Show my check-in and check-out logs for today and calculate my total hours.",
      chart: "📋 Daily Log",
      type: "Personal Status"
    },
    {
      id: "emp-attendance-month",
      module: "Attendance",
      icon: "⏱️",
      title: "Monthly Attendance Summary",
      desc: "Count of Present, Absent, Half Day, and Late entries this month.",
      prompt: "Show my attendance summary for this month including total present, absent, half days, and late entries.",
      chart: "📊 Attendance Grid",
      type: "Personal Status"
    },

    // ── 13. Employee Self-Service: Weekly Timesheets ──
    {
      id: "emp-timesheet-log",
      module: "Timesheet",
      icon: "🕒",
      title: "Log Today's Work Timesheet",
      desc: "Submit work hours with activity type and project for today.",
      prompt: "Create a timesheet entry for today with 8 hours of [Execution] work on [Project].",
      chart: "⏱️ Time Log",
      type: "Quick Action"
    },
    {
      id: "emp-timesheet-week",
      module: "Timesheet",
      icon: "🕒",
      title: "Weekly Timesheet Summary",
      desc: "Review all timesheet entries logged for the current week.",
      prompt: "Show all my timesheets submitted for this week with total logged hours and status.",
      chart: "📊 Weekly Hours",
      type: "Personal Status"
    },

    // ── 14. Employee Self-Service: Leaves & Holidays ──
    {
      id: "emp-leave-balance",
      module: "Leaves",
      icon: "📅",
      title: "Check Remaining Leave Balance",
      desc: "Casual, Sick, and Privileged leave balance available.",
      prompt: "What is my remaining leave balance for Casual Leave, Sick Leave, and Privileged Leave?",
      chart: "📊 Leave Balances",
      type: "Personal Status"
    },
    {
      id: "emp-leave-apply",
      module: "Leaves",
      icon: "📅",
      title: "Apply for Leave",
      desc: "Draft a leave application with dates, leave type, and reason.",
      prompt: "Draft a leave application for [2 days] from [Tomorrow] for [Casual Leave] due to [Personal work].",
      chart: "📝 Leave Draft",
      type: "Actionable"
    },
    {
      id: "emp-holidays",
      module: "Leaves",
      icon: "📅",
      title: "Upcoming Company Holidays",
      desc: "Next 60 days official holidays list.",
      prompt: "List all upcoming company holidays for the next 60 days.",
      chart: "🏖️ Holiday Calendar",
      type: "Company Info"
    },

    // ── 15. Employee Self-Service: Salary & Payslips ──
    {
      id: "emp-payslip-latest",
      module: "Salary",
      icon: "💰",
      title: "Latest Payslip Breakdown",
      desc: "Gross, Basic, HRA, Deductions (PF, PT, TDS) and Net Pay.",
      prompt: "Show my latest payslip details with a breakdown of Gross Pay, Basic, HRA, Deductions (PF, PT, TDS), and Net Pay.",
      chart: "📊 Pay Slip",
      type: "Personal Finance"
    },
    {
      id: "emp-payslip-history",
      module: "Salary",
      icon: "💰",
      title: "Salary History (Last 6 Months)",
      desc: "Summary of net salaries credited over the last 6 months.",
      prompt: "List my salary slips for the last 6 months with net pay and payment dates.",
      chart: "📈 Salary Trend",
      type: "Personal Finance"
    },

    // ── 16. Employee Self-Service: Expense Claims ──
    {
      id: "emp-expense-claim",
      module: "Expenses",
      icon: "💳",
      title: "Submit Expense Reimbursement",
      desc: "Draft a travel, meal, or client expense claim with amount.",
      prompt: "Help me submit an expense claim for [Travel] of [Rs 1,500] incurred on [Yesterday].",
      chart: "📝 Claim Form",
      type: "Actionable"
    },
    {
      id: "emp-expense-status",
      module: "Expenses",
      icon: "💳",
      title: "Pending Reimbursements Status",
      desc: "Track status of recent expense claims submitted.",
      prompt: "Check the approval and reimbursement status of my recent expense claims.",
      chart: "📋 Claim Status",
      type: "Personal Status"
    },

    // ── 17. HR Manager: Team Attendance & Absenteeism ──
    {
      id: "hr-absent-today",
      module: "Team Attendance",
      icon: "👥",
      title: "Today's Absent & On-Leave Staff",
      desc: "Department-wise list of absent and on-leave employees today.",
      prompt: "List all employees who are absent or on leave today, grouped by department.",
      chart: "⚠️ Absenteeism Grid",
      type: "HR Oversight"
    },
    {
      id: "hr-missing-checkins",
      module: "Team Attendance",
      icon: "👥",
      title: "Missing Check-ins Today",
      desc: "Employees who haven't marked arrival check-in today.",
      prompt: "Identify employees who have not marked their check-in today.",
      chart: "⚠️ Attendance Alert",
      type: "HR Oversight"
    },

    // ── 18. HR Manager: Leave Approvals ──
    {
      id: "hr-pending-leaves",
      module: "Leave Approvals",
      icon: "📝",
      title: "Pending Leave Applications",
      desc: "Applications waiting for manager review and approval.",
      prompt: "Show all pending leave applications waiting for approval with employee name, dates, leave type, and reason.",
      chart: "📋 Approval Queue",
      type: "HR Action"
    },

    // ── 19. HR Manager: Payroll & Compliance ──
    {
      id: "hr-payroll-summary",
      module: "Payroll",
      icon: "💰",
      title: "Monthly Payroll Cost Summary",
      desc: "Department-wise gross pay, statutory deductions (PF, ESIC, PT), and net payable.",
      prompt: "Summarize this month's payroll by department showing total gross pay, deductions (PF, ESIC, PT), and net payable.",
      chart: "🍩 Department Payroll",
      type: "HR Finance"
    },
    {
      id: "hr-unmarked-attendance",
      module: "Payroll",
      icon: "💰",
      title: "Unmarked Attendance Audit before Payroll",
      desc: "Audit unverified attendance records before running salary slips.",
      prompt: "List all employees who have unmarked attendance for the current payroll cycle.",
      chart: "⚠️ Payroll Risk",
      type: "HR Compliance"
    },

    // ── 20. HR Manager: Workforce Analytics ──
    {
      id: "hr-headcount-dept",
      module: "Analytics",
      icon: "📊",
      title: "Department Headcount Distribution",
      desc: "Active employee count breakdown across all departments.",
      prompt: "Show employee headcount breakdown across all active departments with an interactive chart.",
      chart: "📊 Headcount Bar",
      type: "HR Analytics"
    },
    {
      id: "hr-attrition-tenure",
      module: "Analytics",
      icon: "📊",
      title: "Tenure & Attrition Analysis",
      desc: "Average employee tenure and departments with turnover.",
      prompt: "Analyze employee tenure and highlight departments with highest turnover in the last 12 months.",
      chart: "📈 Tenure Chart",
      type: "HR Analytics"
    },

    // ── 21. HR Manager: Recruitment ──
    {
      id: "hr-openings-applicants",
      module: "Recruitment",
      icon: "💼",
      title: "Open Positions & Applicants",
      desc: "Active Job Openings and candidate application funnel.",
      prompt: "List all active Job Openings with current status and number of Job Applicants.",
      chart: "📋 Hiring Funnel",
      type: "HR Recruitment"
    }
  ];

  // Ribbon Module Categories with pre-computed counts
  const ALL_MODULE_TABS = [
    // Employee tabs
    { key: "Attendance", label: "Check-in & Attendance", icon: "⏱️", category: "employee" },
    { key: "Timesheet", label: "Weekly Timesheets", icon: "🕒", category: "employee" },
    { key: "Leaves", label: "Leaves & Holidays", icon: "📅", category: "employee" },
    { key: "Salary", label: "Salary & Payslips", icon: "💰", category: "employee" },
    { key: "Expenses", label: "Expense Claims", icon: "💳", category: "employee" },

    // HR Manager tabs
    { key: "Team Attendance", label: "Team Attendance", icon: "👥", category: "hr" },
    { key: "Leave Approvals", label: "Leave Approvals", icon: "📝", category: "hr" },
    { key: "Payroll", label: "Payroll Processing", icon: "💰", category: "hr" },
    { key: "Analytics", label: "Workforce Analytics", icon: "📊", category: "hr" },
    { key: "Recruitment", label: "Recruitment", icon: "💼", category: "hr" },

    // Operations / ERP tabs
    { key: "Manufacturing", label: "Manufacturing", icon: "🏭", category: "erp" },
    { key: "Accounting", label: "Accounting", icon: "💰", category: "erp" },
    { key: "Buying", label: "Buying", icon: "🛒", category: "erp" },
    { key: "Selling", label: "Selling", icon: "📈", category: "erp" },
    { key: "Stock", label: "Stock", icon: "📦", category: "erp" },
    { key: "Projects", label: "Projects", icon: "📐", category: "erp" },
    { key: "Quality", label: "Quality", icon: "🔬", category: "erp" },
    { key: "CRM", label: "CRM", icon: "🤝", category: "erp" },
    { key: "Assets", label: "Assets", icon: "🏢", category: "erp" },
    { key: "Subcontracting", label: "Subcontracting", icon: "🔨", category: "erp" },
    { key: "360° Cross", label: "360° Cross-Modular", icon: "🌐", is_cross: true, category: "erp" },
  ];

  custom_ui.ai.getExecutiveTabsForUser = function () {
    const roles = (frappe.user_roles || []);
    const isEmployee = roles.includes("Employee") || roles.includes("Employee Self Service");
    const isHr = roles.includes("HR Manager") || roles.includes("HR User");
    const isAdmin = roles.includes("System Manager") || roles.includes("Administrator");
    const hasMfg = roles.includes("Manufacturing Manager") || roles.includes("Manufacturing User");

    // Standard employee: only show employee tabs
    if (isEmployee && !isAdmin && !isHr && !hasMfg) {
      return ALL_MODULE_TABS.filter(t => t.category === "employee");
    }

    // HR Manager: show HR tabs + Employee tabs (+ Projects, Assets)
    if (isHr && !isAdmin && !hasMfg) {
      let tabs = ALL_MODULE_TABS.filter(t => t.category === "hr" || t.category === "employee");
      if (roles.includes("Projects Manager") || roles.includes("Projects User")) {
        tabs = tabs.concat(ALL_MODULE_TABS.filter(t => t.key === "Projects"));
      }
      tabs = tabs.concat(ALL_MODULE_TABS.filter(t => t.key === "Assets"));
      return tabs;
    }

    // Admin / Manufacturing / Multi-role: return all tabs
    return ALL_MODULE_TABS;
  };

  custom_ui.ai.getDefaultModuleForUser = function () {
    const roles = (frappe.user_roles || []);
    const isEmployee = roles.includes("Employee") || roles.includes("Employee Self Service");
    const isHr = roles.includes("HR Manager") || roles.includes("HR User");
    const isAdmin = roles.includes("System Manager") || roles.includes("Administrator");
    const hasMfg = roles.includes("Manufacturing Manager") || roles.includes("Manufacturing User");

    if (isEmployee && !isAdmin && !isHr && !hasMfg) {
      return "Attendance";
    }
    if (isHr && !isAdmin && !hasMfg) {
      return "Team Attendance";
    }
    return "Manufacturing";
  };

  custom_ui.ai.getPlaceholderForUser = function () {
    const roles = (frappe.user_roles || []);
    const isEmployee = roles.includes("Employee") || roles.includes("Employee Self Service");
    const isHr = roles.includes("HR Manager") || roles.includes("HR User");
    const isAdmin = roles.includes("System Manager") || roles.includes("Administrator");
    const hasMfg = roles.includes("Manufacturing Manager") || roles.includes("Manufacturing User");

    if (isEmployee && !isAdmin && !isHr && !hasMfg) {
      return "Ask about your check-in, leaves, payslips, timesheets, or expense claims…";
    }
    if (isHr && !isAdmin && !hasMfg) {
      return "Ask about team attendance, leave approvals, payroll, or workforce analytics…";
    }
    return "Ask about invoices, orders, stock, or any ERPNext data…";
  };

  custom_ui.ai.getExecutivePromptsForUser = function () {
    const tabs = custom_ui.ai.getExecutiveTabsForUser();
    const allowedKeys = tabs.map(t => t.key);
    return custom_ui.ai.executivePrompts.filter(p => allowedKeys.includes(p.module));
  };

  // Compatibility export
  custom_ui.ai.executiveModuleTabs = ALL_MODULE_TABS;

})();

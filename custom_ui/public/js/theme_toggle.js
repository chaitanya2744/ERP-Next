/**
 * theme_toggle.js — Apple HIG UX Engine (Permanent Apple Liquid Glass)
 * 1. Enforces Apple Liquid Glass theme across Desk without any toggle UI.
 * 2. Apple Spotlight Search shortcut (Ctrl+K / Cmd+K).
 * 3. Sidebar Toggle shortcut (Ctrl+\ / Cmd+\).
 */
(function () {
    "use strict";

    const THEME_KEY = "custom_ui_desk_theme";

    function enforceAppleTheme() {
        try {
            localStorage.setItem(THEME_KEY, "apple");
        } catch (e) {}

        const root = document.documentElement;
        const body = document.body;

        if (root) {
            root.classList.add("theme-apple");
            root.classList.remove("theme-v9");
        }
        if (body) {
            body.classList.add("theme-apple");
            body.classList.remove("theme-v9");
        }

        // Clean up legacy toggle dock if still present in DOM
        const oldDock = document.getElementById("cu-theme-toggle-dock");
        if (oldDock) oldDock.remove();
        const oldDockClass = document.querySelector(".cu-theme-toggle-dock");
        if (oldDockClass) oldDockClass.remove();
    }

    // Apply immediately to prevent FOUC
    enforceAppleTheme(); updateWorkspaceView();

    
    /* ─── Apple UX: Workspace Header Detection ─── */
    function updateWorkspaceView() {
        const route = (window.frappe && frappe.get_route_str ? frappe.get_route_str() : "").toLowerCase();
        const curPage = window.cur_page && cur_page.page ? cur_page.page.label : "";
        const isWorkspace = route.startsWith("workspace") || curPage === "Workspaces" || (!route && document.querySelector('[data-page-route="Workspaces"]:not([style*="display: none"])'));
        
        if (isWorkspace) {
            document.body.classList.add("is-workspace-view");
        } else {
            document.body.classList.remove("is-workspace-view");
        }
    }

    /* ─── Apple UX 1: Spotlight Search (Ctrl+K / Cmd+K) ─── */
    function openSpotlight() {
        const searchInput = document.querySelector(".navbar .search-bar input, #navbar-search, input[data-hotkey='ctrl+k'], .navbar-search-bar input");
        if (searchInput) {
            searchInput.focus();
            searchInput.click();
            return;
        }
        if (window.frappe && frappe.searchdialog && frappe.searchdialog.search) {
            frappe.searchdialog.search.show();
            return;
        }
        const searchBtn = document.querySelector(".navbar .search-bar, .navbar [data-action='search'], .nav-item.search-bar");
        if (searchBtn) searchBtn.click();
    }

    /* ─── Apple UX 2: Toggle Sidebar (Ctrl+\ / Cmd+\) ─── */
    function toggleSidebar() {
        const sidebarToggleBtn = document.querySelector(".sidebar-toggle-btn, .page-head .toggle-sidebar, .body-sidebar-container .toggle-sidebar");
        if (sidebarToggleBtn) {
            sidebarToggleBtn.click();
            return;
        }
        const container = document.querySelector(".body-sidebar-container");
        if (container) {
            container.classList.toggle("collapsed");
            container.classList.toggle("expanded");
        }
    }

    /* ─── Apple UX 3: Global Keyboard Shortcuts ─── */
    window.addEventListener("keydown", function (e) {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const metaKey = isMac ? e.metaKey : e.ctrlKey;

        // Spotlight: Cmd+K or Ctrl+K
        if (metaKey && (e.key === "k" || e.key === "K")) {
            e.preventDefault();
            openSpotlight();
        }
        // Sidebar: Cmd+\ or Ctrl+\
        if (metaKey && e.key === "\\") {
            e.preventDefault();
            toggleSidebar();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() { enforceAppleTheme(); updateWorkspaceView(); });
    } else {
        enforceAppleTheme(); updateWorkspaceView();
    }

    document.addEventListener("page-change", function() { enforceAppleTheme(); updateWorkspaceView(); });
    if (window.frappe && frappe.router) {
        frappe.router.on("change", function() { enforceAppleTheme(); updateWorkspaceView(); });
    }
})();

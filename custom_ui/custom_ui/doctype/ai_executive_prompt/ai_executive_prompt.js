frappe.ui.form.on("AI Executive Prompt", {
    refresh: function(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__("Test in AI Assistant"), function() {
                frappe.set_route("ai");
            });
        }
    }
});

import frappe
from frappe.model.document import Document

class AIExecutivePrompt(Document):
    def on_update(self):
        frappe.cache.delete_key("ai_executive_prompts_all")

    def on_trash(self):
        frappe.cache.delete_key("ai_executive_prompts_all")

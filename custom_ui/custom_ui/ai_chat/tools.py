"""Compatibility facade for the AI chat tool helpers."""

from custom_ui.custom_ui.ai_chat.toolkit.normalizers import normalize_document_data
from custom_ui.custom_ui.ai_chat.toolkit.parsing import extract_date, extract_qty
from custom_ui.custom_ui.ai_chat.toolkit.registry import execute_tool
from custom_ui.custom_ui.ai_chat.toolkit.resolvers import (
    resolve_customer,
    resolve_item,
    resolve_supplier,
    resolve_warehouse,
)
from custom_ui.custom_ui.ai_chat.toolkit.transliteration import transliterate_devanagari

__all__ = [
    "execute_tool",
    "extract_date",
    "extract_qty",
    "normalize_document_data",
    "resolve_customer",
    "resolve_item",
    "resolve_supplier",
    "resolve_warehouse",
    "transliterate_devanagari",
]

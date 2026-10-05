"""Compatibility exports for AI chat configuration."""

from custom_ui.custom_ui.ai_chat.configuration.model import (
    GEMINI_ENDPOINT,
    GEMINI_MODEL,
    MAX_HISTORY,
    MAX_TOKENS,
)
from custom_ui.custom_ui.ai_chat.configuration.system_prompt import SYSTEM_PROMPT
from custom_ui.custom_ui.ai_chat.configuration.tool_schemas import GEMINI_TOOLS

__all__ = [
    "GEMINI_ENDPOINT",
    "GEMINI_MODEL",
    "MAX_HISTORY",
    "MAX_TOKENS",
    "SYSTEM_PROMPT",
    "GEMINI_TOOLS",
]

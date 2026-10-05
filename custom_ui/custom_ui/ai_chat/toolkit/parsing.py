import re

from frappe.utils import add_days, getdate, nowdate

from custom_ui.custom_ui.ai_chat.toolkit.transliteration import transliterate_devanagari


def extract_date(text):
    if not text:
        return str(add_days(nowdate(), 7)), ""
    raw = str(text)
    if re.search(r'[\u0900-\u097F]', raw):
        raw = raw + " " + transliterate_devanagari(raw)

    months = r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
    date_pat = rf'(?:(?:till|by|before|on|date|schedule)\s*[:=]?\s*)?(\b\d{{1,2}}(?:st|nd|rd|th)?\s+{months}\s+\d{{4}}\b|\b{months}\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}}\b|\b\d{{4}}-\d{{2}}-\d{{2}}\b|\b\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{4}}\b)'
    m = re.search(date_pat, raw, re.I)
    if m:
        try:
            raw_d = re.sub(r'(st|nd|rd|th)', '', m.group(1))
            return str(getdate(raw_d)), m.group(0)
        except Exception:
            pass
    return str(add_days(nowdate(), 7)), ""


def extract_qty(text, matched_date_str=""):
    clean = text
    if matched_date_str:
        clean = clean.replace(matched_date_str, " ")
    clean = re.sub(r'202\d', ' ', clean)
    m = re.search(r'(?:qty|quantity|quanitty|units|nos|pcs|bags)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:litres|litre|units|bags|pcs|pieces|nos|kg|qty|quantity|quanitty)?', clean, re.I)
    if m:
        try:
            return float(m.group(1))
        except Exception:
            pass
    return 1.0

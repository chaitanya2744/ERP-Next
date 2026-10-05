import re


DEV_MAP = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'z', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'r': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'gy',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    'ॅ': 'a', 'ॉ': 'o', 'ः': 'h', '्': '', '़': '',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri'
}


def transliterate_devanagari(text: str) -> str:
    if not text or not re.search(r'[\u0900-\u097F]', text):
        return text or ""
    t = text
    t = t.replace('सोल्यूशन्स', 'solutions')
    t = t.replace('सोल्युशन्स', 'solutions')
    t = t.replace('सोल्यूशन', 'solution')
    t = t.replace('झेनिथ', 'zenith')
    t = t.replace('रेझिन', 'resin')
    t = t.replace('रेसीन', 'resin')
    t = t.replace('रेझ्यूम', 'resin')
    t = t.replace('इपॉक्सी', 'epoxy')
    t = t.replace('बायपॉक्सी', 'epoxy')
    t = t.replace('डिपॉक्सी', 'epoxy')
    t = t.replace('चाकण', 'chakan')
    t = t.replace('भोसरी', 'bhosari')
    t = t.replace('लिटर्स', 'litres')
    t = t.replace('लिटर', 'litre')
    t = t.replace('ऑक्टोबर', 'october')
    t = t.replace('आरएफक्यू', 'rfq')
    t = t.replace('आर एफ क्यू', 'rfq')
    t = t.replace('कोटेशन', 'quotation')
    t = t.replace('कोर्टेशन', 'quotation')
    t = t.replace('रिटवेस्', 'request')
    t = t.replace('रिक्वेस्ट', 'request')
    res = []
    for ch in t:
        if ch in DEV_MAP:
            res.append(DEV_MAP[ch])
        else:
            res.append(ch)
    return "".join(res)

GEMINI_MODEL = "gemini-3.1-flash-lite"          # fast + smart, free tier available

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={api_key}"
)

MAX_TOKENS  = 8192
MAX_HISTORY = 20   # keep last N messages to avoid token overflow

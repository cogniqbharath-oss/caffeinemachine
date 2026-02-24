#!/usr/bin/env python3
"""
Caffeine Machine – Local Development Server
============================================
Serves the static website AND proxies /api/chat to the Gemini API.

Usage:
  1. Set your API key:
       Windows:  set GEMINI_API_KEY=your_key_here
       Mac/Linux: export GEMINI_API_KEY=your_key_here

  2. Run:
       python server.py

  3. Open http://localhost:8000 in your browser

Requirements: Python 3.8+  (no extra packages needed)
"""

import http.server
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────
PORT         = 3000
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL   = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
API_KEY      = os.environ.get("GEMINI_API_KEY", "")

# ─── MIME types ───────────────────────────────────────────────────────────────
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".webp": "image/webp",
    ".woff2":"font/woff2",
    ".woff": "font/woff",
}

class CaffeineHandler(http.server.BaseHTTPRequestHandler):

    # ── Silence default request logs ──────────────────────────────────────────
    def log_message(self, fmt, *args):
        print(f"  [{self.command}] {self.path}  =>  {args[1] if len(args) > 1 else ''}")

    # ─────────────────────────────────────────────────────────────────────────
    def do_OPTIONS(self):
        self._send_cors()

    def do_GET(self):
        path = self.path.split("?")[0]

        # Default to index.html
        if path == "/" or path == "":
            path = "/index.html"

        # Resolve file
        file_path = Path(__file__).parent / path.lstrip("/")

        if file_path.is_file():
            ext  = file_path.suffix.lower()
            mime = MIME.get(ext, "application/octet-stream")
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", len(data))
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data)
        else:
            self._not_found()

    def do_POST(self):
        path = self.path.split("?")[0]

        if path == "/api/chat":
            self._handle_chat()
        else:
            self._not_found()

    # ─────────────────────────────────────────────────────────────────────────
    def _handle_chat(self):
        length = int(self.headers.get("Content-Length", 0))
        raw    = self.rfile.read(length)

        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            return self._json_error(400, "Invalid JSON body")

        message       = body.get("message", "").strip()
        history       = body.get("history", [])
        system_prompt = body.get("systemPrompt", "")

        if not message:
            return self._json_error(400, 'Missing "message" field')

        if not API_KEY:
            print("\n  ⚠  GEMINI_API_KEY not set – returning fallback response.\n")
            fallback = self._fallback(message)
            return self._json_ok({"reply": fallback})

        # Build Gemini request
        contents = []
        if system_prompt:
            contents.append({"role": "user",  "parts": [{"text": system_prompt}]})
            contents.append({"role": "model", "parts": [{"text": "Understood! I'm ready to assist as the Caffeine Machine AI barista. ☕"}]})

        for turn in history[-10:]:
            if "role" in turn and "parts" in turn:
                contents.append(turn)

        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = json.dumps({
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 512,
            }
        }).encode("utf-8")

        url = f"{GEMINI_URL}?key={API_KEY}"
        req = urllib.request.Request(url, data=payload,
                                     headers={"Content-Type": "application/json"},
                                     method="POST")

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            print(f"  Gemini HTTP error {e.code}: {err_body[:300]}")
            return self._json_error(502, f"Gemini API error {e.code}", err_body)
        except Exception as e:
            print(f"  Network error: {e}")
            return self._json_error(502, "Failed to reach Gemini API", str(e))

        try:
            reply = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            finish = data.get("candidates", [{}])[0].get("finishReason", "UNKNOWN")
            return self._json_error(502, f"No reply from Gemini (finishReason={finish})")

        self._json_ok({"reply": reply})

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _fallback(text):
        t = text.lower()
        if any(w in t for w in ["flight", "flights"]):
            return "☕ Coffee Flights start at $9.50+tax — choose up to 4 flavors hot or iced! Available every day. Favorites include Lavender Honey, Teddy Graham, Funky Monkey Mocha, and Blueberry Cobbler Cold Brew."
        if any(w in t for w in ["hour", "open", "close", "time"]):
            return "🕐 We're open Mon–Fri 7AM–6PM, Saturday 8AM–6PM, Sunday 8AM–4PM. See you soon!"
        if any(w in t for w in ["location", "address", "where", "direction"]):
            return "📍 4520 S. Hualapai Way, Ste 109, Las Vegas, NV 89147 — Southwest LV near Mountains Edge. Easy parking in the strip mall!"
        if any(w in t for w in ["food", "eat", "bagel", "oatmeal", "bite"]):
            return "🥯 Light bites: Toasted Bagels ($6.75) with PB/banana/granola or balsamic/everything seasoning, Apple Chai Oatmeal ($5.50), pastries, and charcuterie snack boxes."
        if any(w in t for w in ["price", "cost", "how much", "menu"]):
            return "💰 Flights from $9.50 | Lattes $4.40–$4.90 | Cold Brews $5.25–$5.45 | Matcha $5.35 | Food $5.50–$6.75. Great value for incredible coffee!"
        return "☕ Hi! I'm the Caffeine Machine AI barista. Ask me about flights, the menu, hours, or location. For direct help: (702) 444-0471 or info@caffeinemachinelv.com"

    # ─────────────────────────────────────────────────────────────────────────
    def _json_ok(self, data):
        self._respond(200, json.dumps(data))

    def _json_error(self, code, msg, details=None):
        payload = {"error": msg}
        if details:
            payload["details"] = details
        self._respond(code, json.dumps(payload))

    def _respond(self, code, body_str):
        body = body_str.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_cors(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _not_found(self):
        body = b"404 Not Found"
        self.send_response(404)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)


# ─── Start server ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not API_KEY:
        print("WARNING: GEMINI_API_KEY is not set.")
        print("  The chatbot will use fallback responses only.")
        print("  Set it with:  set GEMINI_API_KEY=your_key_here  (Windows)")
        print()

    print("================================================")
    print("  Caffeine Machine - Local Dev Server")
    print(f"  http://localhost:{PORT}")
    print("  Press Ctrl+C to stop")
    print("================================================")
    print()

    httpd = http.server.HTTPServer(("", PORT), CaffeineHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")

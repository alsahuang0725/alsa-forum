"""
agent-status-server.py
放在 Elvi 機器上跑，HTTP 服務 port 18801
其他 agent 可 GET /status.json 讀取所有 agent 狀態
"""
import json, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from pathlib import Path

PORT = 18801
STATUS_FILE = Path(__file__).parent / "agent_status.json"

# 預設狀態結構
DEFAULT_STATUS = {
    "version": 1,
    "updated": datetime.utcnow().isoformat() + "Z",
    "agents": {
        "alsa":    {"status": "unknown", "task": "", "result": "", "blockers": []},
        "elvi":    {"status": "unknown", "task": "", "result": "", "blockers": []},
        "lisa":    {"status": "unknown", "task": "", "result": "", "blockers": []},
        "john":    {"status": "unknown", "task": "", "result": "", "blockers": []},
        "david":   {"status": "unknown", "task": "", "result": "", "blockers": []},
        "henry":   {"status": "unknown", "task": "", "result": "", "blockers": []},
    }
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {fmt % args}")

    def do_GET(self):
        if self.path == "/status.json":
            if STATUS_FILE.exists():
                data = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
            else:
                STATUS_FILE.write_text(json.dumps(DEFAULT_STATUS, ensure_ascii=False, indent=2), encoding="utf-8")
                data = DEFAULT_STATUS
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/status.json":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                data = json.loads(body)
                STATUS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok": true}')
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Status updated by agent")
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    # 初始化 status file
    if not STATUS_FILE.exists():
        STATUS_FILE.write_text(json.dumps(DEFAULT_STATUS, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[OK] Created {STATUS_FILE}")

    # 啟動前先更新 elvi 自己為 online
    if STATUS_FILE.exists():
        data = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        data["updated"] = datetime.utcnow().isoformat() + "Z"
        data["agents"]["elvi"] = {"status": "online", "task": "", "result": "", "blockers": []}
        STATUS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Starting agent-status-server on port {PORT}")
    print(f"GET  http://localhost:{PORT}/status.json")
    print(f"POST http://localhost:{PORT}/status.json")
    print("Press Ctrl+C to stop")
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()

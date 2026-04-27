#!/usr/bin/env python3
"""
Serveur local du portfolio.
- Sert les fichiers statiques (site + admin)
- POST /save       : enregistre content.json
- POST /upload     : enregistre une image dans assets/images/uploads/
- GET  /mtime      : renvoie le timestamp de content.json (pour l'auto-refresh)
- GET  /list-images: liste les images disponibles dans assets/images/
"""
import base64
import http.server
import json
import mimetypes
import os
import re
import socketserver
import sys
import threading
import time
import webbrowser
from pathlib import Path

PORT = 8765
ROOT = Path(__file__).parent.resolve()
CONTENT_FILE = ROOT / "content.json"
IMAGES_DIR = ROOT / "assets" / "images"
UPLOADS_DIR = IMAGES_DIR / "uploads"

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".avif", ".svg"}


def log(msg, color=""):
    colors = {
        "ok": "\033[92m", "warn": "\033[93m", "err": "\033[91m",
        "info": "\033[96m", "dim": "\033[90m", "end": "\033[0m",
    }
    c = colors.get(color, "")
    e = colors["end"] if c else ""
    print(f"{c}{msg}{e}")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        # Silencieux — on n'affiche que nos propres logs
        return

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/mtime"):
            try:
                mtime = os.path.getmtime(CONTENT_FILE)
                return self._send_json(200, {"mtime": mtime})
            except FileNotFoundError:
                return self._send_json(200, {"mtime": 0})

        if self.path.startswith("/list-images"):
            if not IMAGES_DIR.exists():
                return self._send_json(200, {"images": []})
            imgs = []
            for p in sorted(IMAGES_DIR.rglob("*")):
                if p.is_file() and p.suffix.lower() in ALLOWED_EXT:
                    rel = p.relative_to(ROOT).as_posix()
                    imgs.append(rel)
            return self._send_json(200, {"images": imgs})

        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""

        if self.path == "/save":
            try:
                data = json.loads(raw.decode("utf-8"))
                tmp = CONTENT_FILE.with_suffix(".json.tmp")
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                tmp.replace(CONTENT_FILE)
                log(f"  ✓ content.json enregistré  ({time.strftime('%H:%M:%S')})", "ok")
                return self._send_json(200, {"ok": True})
            except Exception as e:
                log(f"  ✗ Erreur save: {e}", "err")
                return self._send_json(500, {"ok": False, "error": str(e)})

        if self.path == "/upload":
            try:
                payload = json.loads(raw.decode("utf-8"))
                filename = payload["filename"]
                b64 = payload["data"]
                # Nettoyage du nom de fichier
                safe = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
                ext = Path(safe).suffix.lower()
                if ext not in ALLOWED_EXT:
                    return self._send_json(400, {"ok": False, "error": f"Extension non autorisée: {ext}"})
                UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                # Évite les collisions
                target = UPLOADS_DIR / safe
                i = 1
                while target.exists():
                    target = UPLOADS_DIR / f"{Path(safe).stem}-{i}{ext}"
                    i += 1
                raw_bytes = base64.b64decode(b64.split(",", 1)[-1])
                with open(target, "wb") as f:
                    f.write(raw_bytes)
                rel = target.relative_to(ROOT).as_posix()
                log(f"  ✓ image importée : {rel}", "ok")
                return self._send_json(200, {"ok": True, "path": rel})
            except Exception as e:
                log(f"  ✗ Erreur upload: {e}", "err")
                return self._send_json(500, {"ok": False, "error": str(e)})

        self.send_response(404)
        self.end_headers()


class ReuseTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main():
    os.chdir(ROOT)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    port = PORT
    httpd = None
    for p in range(PORT, PORT + 20):
        try:
            httpd = ReuseTCPServer(("127.0.0.1", p), Handler)
            port = p
            break
        except OSError:
            continue
    if httpd is None:
        log("Impossible de trouver un port libre.", "err")
        sys.exit(1)

    url = f"http://localhost:{port}/"
    admin_url = f"{url}admin.html"

    print()
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "dim")
    log("   PORTFOLIO  —  serveur local actif", "info")
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "dim")
    log(f"   🌐  Site      : {url}", "ok")
    log(f"   ✏️   Éditeur   : {admin_url}", "ok")
    log(f"   📁  Dossier   : {ROOT}", "dim")
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "dim")
    log("   Ctrl+C pour arrêter le serveur", "dim")
    print()

    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        log("Serveur arrêté. À bientôt ✨", "info")
        httpd.server_close()


if __name__ == "__main__":
    main()

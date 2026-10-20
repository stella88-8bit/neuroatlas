#!/usr/bin/env python3
"""Serve the local atlas. No packages, cloud connection or build step required."""
import functools
import http.server
import pathlib
import socketserver
import threading
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent / 'dist'
class AtlasServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
try:
    server = AtlasServer(('127.0.0.1', 8765), handler)
except OSError:
    server = AtlasServer(('127.0.0.1', 0), handler)
url = f'http://127.0.0.1:{server.server_port}/'
print(f'NEUROATLAS открыт: {url}\nОставьте это окно открытым. Для остановки нажмите Ctrl+C.', flush=True)
threading.Timer(0.4, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()

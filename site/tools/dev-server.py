#!/usr/bin/env python3
"""Static file server for local design work — the same thing as
`python3 -m http.server`, except nothing is allowed to be cached.

Why this exists: index.html references css/klar.css and js/klar.js by bare
path, deliberately — the content hash is stamped on at deploy time by
stamp-assets.mjs so the committed HTML stays clean and diffable. Locally that
means the URL never changes when the file does, and `http.server` sends no
Cache-Control at all, only Last-Modified. Chrome then applies its heuristic
freshness rule and keeps serving the stylesheet it already has.

The failure mode is nasty because it does not look like a caching problem: the
new HTML loads against the old CSS, so unstyled elements fall back to plain
blocks — a grid becomes a stacked list, a sized photograph becomes a
full-width one — and the page reads as a layout bug that does not reproduce
anywhere else.

Run: python3 site/tools/dev-server.py [port]
"""

import functools
import http.server
import socketserver
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # one line per request, no timestamp noise
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
    handler = functools.partial(NoCacheHandler, directory=str(SITE))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"klar dev server on http://localhost:{port}  (no-store)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()

from http.server import BaseHTTPRequestHandler
import json

# STUB for Phase 1 — unblocks Teammate B's Phase 5 (MCP server) without
# waiting on the real Semantic Scholar integration. Replaced in Phase 4.
# Response shape mirrors lib/types.ts's AgentResult (kept in sync manually
# since this is the one Python file in an otherwise all-TS project).

MOCK_RESULT = {
    "synthesis": "Fake academic synthesis spanning all 3 sub-query angles.",
    "citations": [
        {
            "url": "https://example.org/paper-1",
            "title": "Fake Paper Title One",
            "source": "academic",
        },
        {
            "url": "https://example.org/paper-2",
            "title": "Fake Paper Title Two",
            "source": "academic",
        },
    ],
    "citationCount": 2,
}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(MOCK_RESULT).encode())

    def do_POST(self):
        self.do_GET()

from http.server import BaseHTTPRequestHandler
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

S2_SEARCH = "https://api.semanticscholar.org/graph/v1/paper/search"
S2_FIELDS = "paperId,title,url,abstract,year,venue,citationCount"
PAPER_PAGE = "https://www.semanticscholar.org/paper/"
OPENALEX_SEARCH = "https://api.openalex.org/works"


def _api_key():
    key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY", "").strip()
    return key or None


def _search_once(query, use_key):
    params = urllib.parse.urlencode(
        {"query": query, "limit": "5", "fields": S2_FIELDS}
    )
    url = f"{S2_SEARCH}?{params}"
    headers = {"User-Agent": "scout-academic-agent"}
    key = _api_key() if use_key else None
    if key:
        headers["x-api-key"] = key
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


def search_papers(query):
    try:
        return _search_once(query, use_key=True), None
    except urllib.error.HTTPError as err:
        if err.code == 429:
            retry_after = err.headers.get("Retry-After")
            try:
                wait = float(retry_after) if retry_after else 1.1
            except ValueError:
                wait = 1.1
            time.sleep(max(wait, 0.1))
            try:
                return _search_once(query, use_key=True), None
            except Exception as retry_err:
                return None, str(retry_err)
        if err.code == 403 and _api_key():
            try:
                return _search_once(query, use_key=False), None
            except Exception as anon_err:
                return None, str(anon_err)
        return None, f"HTTP {err.code}"
    except Exception as err:
        return None, str(err)


def _rebuild_abstract(inverted):
    # OpenAlex ships abstracts as {word: [positions]} — flatten back to text.
    if not isinstance(inverted, dict) or not inverted:
        return ""
    positions = {}
    for word, indexes in inverted.items():
        for index in indexes:
            positions[index] = word
    return " ".join(positions[i] for i in sorted(positions))[:1200]


def _openalex_search(query):
    params = urllib.parse.urlencode({"search": query, "per-page": "5"})
    req = urllib.request.Request(
        f"{OPENALEX_SEARCH}?{params}",
        headers={"User-Agent": "scout-academic-agent"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode())
    papers = []
    for work in payload.get("results") or []:
        title = work.get("display_name") or work.get("title")
        primary = work.get("primary_location") or {}
        url = work.get("doi") or primary.get("landing_page_url") or work.get("id")
        if not title or not url:
            continue
        papers.append(
            {
                "paperId": work.get("id") or url,
                "title": title,
                "url": url,
                "abstract": _rebuild_abstract(work.get("abstract_inverted_index")),
            }
        )
    return {"data": papers}


def search_papers_any(query):
    payload, error = search_papers(query)
    if payload:
        return payload, None
    # Semantic Scholar refused (anonymous 429s from shared egress IPs, or a
    # dead key) — OpenAlex needs no auth and has generous limits, so fall
    # back per query instead of failing the whole agent.
    try:
        return _openalex_search(query), None
    except Exception as fallback_err:
        return None, f"s2: {error}; openalex: {fallback_err}"


def paper_url(paper):
    url = paper.get("url")
    if isinstance(url, str) and url:
        return url
    paper_id = paper.get("paperId")
    if isinstance(paper_id, str) and paper_id:
        return PAPER_PAGE + paper_id
    return None


def stitch_synthesis(papers):
    parts = []
    for paper in papers[:8]:
        title = paper.get("title") or "Untitled"
        abstract = (paper.get("abstract") or "").strip().replace("\n", " ")
        excerpt = abstract[:240]
        if excerpt:
            parts.append(f"{title}: {excerpt}")
        else:
            parts.append(title)
    if not parts:
        return "No academic papers were returned for these sub-queries."
    return " ".join(parts)


def run_academic_agent(sub_queries):
    papers_by_id = {}
    failures = []
    for query in sub_queries:
        payload, error = search_papers_any(query)
        if error or not payload:
            failures.append(error or "empty response")
            continue
        for paper in payload.get("data") or []:
            paper_id = paper.get("paperId")
            if not paper_id or paper_id in papers_by_id:
                continue
            papers_by_id[paper_id] = paper
    if not papers_by_id and len(failures) == len(sub_queries):
        return None, "; ".join(failures)
    papers = list(papers_by_id.values())
    citations = []
    for paper in papers:
        url = paper_url(paper)
        title = paper.get("title")
        if not url or not title:
            continue
        citations.append({"url": url, "title": title, "source": "academic"})
    return {
        "synthesis": stitch_synthesis(papers),
        "citations": citations,
        "citationCount": len(citations),
    }, None


def _read_json(handler):
    length = int(handler.headers.get("Content-Length") or "0")
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode() or "{}")


def _write_json(handler, status, body):
    payload = json.dumps(body).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        _write_json(self, 200, {"ok": True, "service": "academic-agent"})

    def do_POST(self):
        try:
            body = _read_json(self)
        except json.JSONDecodeError:
            _write_json(self, 400, {"error": "invalid JSON"})
            return
        sub_queries = body.get("subQueries")
        if (
            not isinstance(sub_queries, list)
            or len(sub_queries) != 3
            or not all(isinstance(q, str) and q.strip() for q in sub_queries)
        ):
            _write_json(
                self,
                400,
                {"error": "subQueries must be an array of exactly 3 strings"},
            )
            return
        result, error = run_academic_agent(sub_queries)
        if error or result is None:
            _write_json(self, 502, {"error": error or "Semantic Scholar failed"})
            return
        _write_json(self, 200, result)

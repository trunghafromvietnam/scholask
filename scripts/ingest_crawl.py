# scripts/ingest_crawl.py
import os, json, re
from pathlib import Path
from bs4 import BeautifulSoup
from html import unescape

try:
    from pdfminer.high_level import extract_text as extract_pdf_text
except Exception:
    extract_pdf_text = None

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "data"

def clean_html(html_bytes):
    soup = BeautifulSoup(html_bytes, "html.parser")
    for s in soup(["script","style","noscript","header","footer","nav","form"]):
        s.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"\n{2,}", "\n\n", text)
    return unescape(text).strip()

def chunk_text(t, size=1200, overlap=150):
    t = t.replace("\r\n","\n")
    out = []
    i = 0
    while i < len(t):
        out.append(t[i:i+size])
        i += max(1, size - overlap)
    return out

def load_raw_records(school_slug: str):
    raw_dir = DATA / school_slug / "raw"
    for meta in raw_dir.glob("*.json"):
        m = json.loads(meta.read_text(encoding="utf-8"))
        sha = m["sha"]
        url = m["url"]
        if m.get("pdf"):
            pdf_path = raw_dir / f"{sha}.pdf"
            if extract_pdf_text is None:
                print("PDF SKIP (pdfminer.six not installed):", url)
                continue
            try:
                text = extract_pdf_text(str(pdf_path)) or ""
            except Exception as e:
                print("PDF ERR", url, e)
                continue
        else:
            html_path = raw_dir / f"{sha}.html"
            if not html_path.exists(): continue
            text = clean_html(html_path.read_bytes())
        yield url, text

def write_chunks(school_slug: str):
    chunks_dir = DATA / school_slug / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    idx = 0
    for url, text in load_raw_records(school_slug):
        parts = chunk_text(text)
        for p in parts:
            (chunks_dir / f"{idx}.txt").write_text(p, encoding="utf-8")
            (chunks_dir / f"{idx}.meta.json").write_text(json.dumps({"url": url}), encoding="utf-8")
            idx += 1
    print("Chunks written:", idx)

if __name__ == "__main__":
    import sys
    slug = sys.argv[1] if len(sys.argv)>1 else "seattle-central-college"
    write_chunks(slug)


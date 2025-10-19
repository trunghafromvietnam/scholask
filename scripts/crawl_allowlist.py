# scripts/crawl_allowlist.py
import os, re, time, json, hashlib
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = os.path.dirname(__file__)
DATA = os.path.join(ROOT, "..", "data")
UA = "ScholaskCrawler/0.1 (+https://scholask.com)"

def is_same_host(a, b):
    return urlparse(a).netloc == urlparse(b).netloc

def fetch(url):
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=15)
        if r.status_code == 200:
            return r.content, r.headers.get("content-type","")
        print("SKIP", url, "status=", r.status_code)
    except Exception as e:
        print("ERR", url, e)
    return None, None

def save_html(doc_dir, url, content):
    h = hashlib.sha1(url.encode()).hexdigest()[:16]
    html_path = os.path.join(doc_dir, f"{h}.html")
    with open(html_path, "wb") as f:
        f.write(content)
    with open(os.path.join(doc_dir, f"{h}.json"), "w", encoding="utf-8") as f:
        json.dump({"url": url, "sha": h, "pdf": False}, f, ensure_ascii=False, indent=2)
    return html_path

def save_pdf(doc_dir, url, content):
    h = hashlib.sha1(url.encode()).hexdigest()[:16]
    pdf_path = os.path.join(doc_dir, f"{h}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(content)
    with open(os.path.join(doc_dir, f"{h}.json"), "w", encoding="utf-8") as f:
        json.dump({"url": url, "sha": h, "pdf": True}, f, ensure_ascii=False, indent=2)
    return pdf_path

def read_allowlist(path):
    seeds = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"): continue
            seeds.append(s)
    return seeds

def crawl_school(school_slug, max_pages=150):
    allow = os.path.join(DATA, f"{school_slug}_allowlist.txt")
    out_dir = os.path.join(DATA, school_slug, "raw")
    os.makedirs(out_dir, exist_ok=True)

    seeds = read_allowlist(allow)
    if not seeds:
        print("No seeds in", allow)
        return

    main_host = urlparse(seeds[0]).netloc
    visited, enqueued = set(), set(seeds)
    q = list(seeds)
    count = 0

    while q and count < max_pages:
        url = q.pop(0)
        if url in visited:
            continue
        visited.add(url)

        content, ctype = fetch(url)
        if not content:
            continue

        if "application/pdf" in (ctype or "") or url.lower().endswith(".pdf"):
            save_pdf(out_dir, url, content)
            print("PDF ", url)
            count += 1
            time.sleep(0.6)
            continue

        html_path = save_html(out_dir, url, content)
        print("HTML", url, "->", html_path)
        count += 1
        time.sleep(0.5)

        # discover links on same host as first seed
        try:
            soup = BeautifulSoup(content, "html.parser")
            for a in soup.select("a[href]"):
                href = (a.get("href") or "").strip()
                if not href or href.startswith(("mailto:", "tel:")):
                    continue
                u = urljoin(url, href)
                if "#" in u:
                    u = u.split("#")[0]
                if not u.startswith("http"):
                    continue
                # only follow same host as first seed
                if urlparse(u).netloc != main_host:
                    continue
                if any(u.lower().endswith(ext) for ext in (".jpg",".jpeg",".png",".gif",".svg",".zip",".mp4",".doc",".docx",".xls",".xlsx")):
                    continue
                if u not in visited and u not in enqueued:
                    q.append(u); enqueued.add(u)
        except Exception as e:
            print("PARSE_ERR", url, e)

if __name__ == "__main__":
    import sys
    slug = sys.argv[1] if len(sys.argv) > 1 else "seattle-central-college"
    crawl_school(slug)


import os, sys, argparse, asyncio
from glob import glob

# Cho phép import backend.app.rag khi chạy từ repo root
sys.path.append(os.getcwd())

try:
    from backend.app import rag
except Exception:
    # fallback nếu chạy từ backend/
    from backend.app import rag

def read_text_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def read_pdf(path: str) -> str:
    try:
        from pypdf import PdfReader
    except Exception as e:
        raise RuntimeError("Missing pypdf. Run: pip install pypdf") from e
    text_parts = []
    r = PdfReader(path)
    for p in r.pages:
        text_parts.append(p.extract_text() or "")
    return "\n\n".join(text_parts)

def collect_files(input_path: str):
    files = []
    if os.path.isdir(input_path):
        # hỗ trợ .md, .txt, .pdf
        for pat in ("*.md", "*.txt", "*.pdf"):
            files += glob(os.path.join(input_path, pat))
    else:
        # là 1 file đơn lẻ
        files.append(input_path)
    return sorted(list(set(files)))

def load_all_text(files):
    texts = []
    for fp in files:
        ext = os.path.splitext(fp)[1].lower()
        try:
            if ext == ".pdf":
                txt = read_pdf(fp)
            else:
                txt = read_text_file(fp)
        except Exception as e:
            print(f"[WARN] Skip {fp}: {e}")
            continue
        txt = (txt or "").strip()
        if len(txt) >= 10:
            texts.append(txt)
    return texts

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--school", required=True, help="school slug, e.g., seattle-central-college")
    ap.add_argument("--input", required=True, nargs="+", help="one or more dirs/files to ingest")
    args = ap.parse_args()

    all_files = []
    for inp in args.input:
        files = collect_files(inp)
        print(f"[INFO] {inp} → {len(files)} file(s)")
        all_files += files

    all_files = sorted(list(set(all_files)))
    if not all_files:
        print(f"[ERR] No files found under {args.input}. Put .md/.txt/.pdf inside these folder(s).")
        return

    print(f"[INFO] Total files: {len(all_files)}")
    texts = load_all_text(all_files)
    print(f"[INFO] Loaded texts: {len(texts)}")

    if not texts:
        print("[ERR] All files were empty/unreadable.")
        return

    # Chunking
    chunks = []
    for t in texts:
        chunks.extend(rag.chunk_text(t))
    print(f"[INFO] Total chunks: {len(chunks)}")

    if not chunks:
        print("[ERR] No chunks produced (input too small?).")
        return

    # Build index
    ids = await rag.embed_and_index(args.school, chunks)
    print(f"[OK] Indexed {len(ids)} chunk(s) for school='{args.school}'.")
    print(f"[OK] Output dir: {os.path.join(os.getcwd(), 'indexes', args.school)}")

if __name__ == "__main__":
    asyncio.run(main())



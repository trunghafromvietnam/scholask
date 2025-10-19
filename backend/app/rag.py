import os
import io
import re
import json
import logging 
import numpy as np
from typing import List, Tuple, Optional
from pypdf import PdfReader
from dotenv import load_dotenv
from textwrap import shorten
from fastapi import HTTPException

load_dotenv()
logging.basicConfig(level=logging.INFO) 
logger = logging.getLogger(__name__)

# ====== Paths / Config ======
_MODULE_DIR = os.path.dirname(__file__)
_BACKEND_DIR = os.path.dirname(_MODULE_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
INDEX_DIR = os.path.abspath(os.path.join(_PROJECT_ROOT, "indexes"))

# Đảm bảo thư mục tồn tại khi module load
try:
    os.makedirs(INDEX_DIR, exist_ok=True)
    logger.info(f"Index directory set to: {INDEX_DIR}")
except OSError as e:
    logger.error(f"Could not create index directory at {INDEX_DIR}: {e}")

REGION     = os.getenv("BEDROCK_REGION", "us-west-2")
EMBED_ID   = os.getenv("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
CLAUDE_ID  = os.getenv("BEDROCK_CLAUDE_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
OFFLINE    = os.getenv("OFFLINE_MODE", "0") == "1"

# Regex để chunk text (giữ nguyên)
_CHUNK_RGX = re.compile(r"(?s).{1,1200}(?:\n|$)") # Khoảng 1200 ký tự mỗi chunk

# Bedrock client (chỉ khởi tạo nếu không offline)
_br = None
if not OFFLINE:
    try:
        import boto3
        _br = boto3.client("bedrock-runtime", region_name=REGION)
        logger.info(f"Bedrock client initialized for region {REGION}.")
    except ImportError:
        logger.error("boto3 not installed. Cannot use Bedrock online mode.")
        _br = None # Đảm bảo _br là None nếu import lỗi
    except Exception as e:
        logger.error(f"Failed to initialize Bedrock client: {e}")
        _br = None
else:
    logger.info("Running in OFFLINE mode. Bedrock client not initialized.")
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np
        _vec = TfidfVectorizer(max_features=4096) # TF-IDF vectorizer cho offline
        logger.info("TF-IDF Vectorizer initialized for offline mode.")
    except ImportError:
        logger.error("scikit-learn or numpy not installed. Offline mode requires them.")
        # Cần xử lý lỗi này nếu offline là bắt buộc

# ====== IO helpers ======
async def load_content(file=None, text: str | None = None, url: str | None = None) -> str:
    """Loads content from file (PDF/text), raw text, or URL (placeholder)."""
    if file is not None:
        file_name = getattr(file, "filename", "unknown_file")
        logger.info(f"Loading content from uploaded file: {file_name}")
        try:
            data = await file.read()
            name_lower = file_name.lower()
            if name_lower.endswith(".pdf"):
                logger.info("Detected PDF file, extracting text...")
                reader = PdfReader(io.BytesIO(data))
                extracted_text = "\n\n".join([p.extract_text() or "" for p in reader.pages if p.extract_text()])
                logger.info(f"Extracted {len(extracted_text)} characters from PDF.")
                return extracted_text
            else: # Treat as plain text
                 logger.info("Detected non-PDF file, decoding as UTF-8.")
                 return data.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"Error processing file {file_name}: {e}")
            return "" # Return empty string on error
    if text:
        logger.info(f"Loading content directly from text input (length: {len(text)}).")
        return text
    if url:
        logger.warning(f"URL ingest ('{url}') is currently a placeholder. Returning URL string.")
        # TODO: Implement actual URL fetching and parsing here for production
        # Example using requests and BeautifulSoup (needs install):
        # try:
        #     import requests
        #     from bs4 import BeautifulSoup
        #     response = requests.get(url, timeout=10)
        #     response.raise_for_status() # Raise error for bad responses (4xx, 5xx)
        #     soup = BeautifulSoup(response.content, 'lxml') # or 'html.parser'
        #     # Extract relevant text (e.g., main content, remove nav/footer)
        #     main_content = soup.find('main') # Example selector
        #     text_content = main_content.get_text(separator='\n', strip=True) if main_content else soup.get_text(separator='\n', strip=True)
        #     logger.info(f"Fetched {len(text_content)} characters from URL.")
        #     return text_content
        # except Exception as e:
        #     logger.error(f"Failed to fetch or parse URL {url}: {e}")
        #     return ""
        return f"Content from URL: {url}" # Placeholder
    logger.warning("load_content called with no file, text, or url.")
    return ""

def chunk_text(content: str) -> List[str]:
    """Splits content into chunks based on regex."""
    content = (content or "").strip()
    if not content:
        return []
    initial_chunks = [p.strip() for p in content.split('\n\n') if p.strip()]
    final_chunks = []
    for chunk in initial_chunks:
        if len(chunk) > 1500: # Apply regex only if a paragraph is too long
            final_chunks.extend([m.group(0).strip() for m in _CHUNK_RGX.finditer(chunk) if m.group(0).strip()])
        else:
            final_chunks.append(chunk)

    # Simpler Regex approach:
    final_chunks = [m.group(0).strip() for m in _CHUNK_RGX.finditer(content) if m.group(0).strip()]

    logger.info(f"Split content into {len(final_chunks)} chunks.")
    return final_chunks

# ====== Index build / search ======
def _faiss_index_add(vectors: List[List[float]]):
    """Creates a FAISS index from vectors."""
    if not vectors or not vectors[0]:
        logger.error("Cannot create FAISS index with empty vectors.")
        return None
    try:
        import numpy as np
        import faiss
        dim = len(vectors[0])
        logger.info(f"Creating FAISS IndexFlatIP with dimension {dim}.")
        index = faiss.IndexFlatIP(dim) # Using Inner Product similarity
        xb = np.array(vectors).astype("float32")
        faiss.normalize_L2(xb) # Normalize vectors for cosine similarity with IP
        index.add(xb)
        logger.info(f"Added {len(vectors)} vectors to FAISS index.")
        return index
    except ImportError:
        logger.error("faiss or numpy not installed. Cannot build FAISS index.")
        return None
    except Exception as e:
        logger.error(f"Error building FAISS index: {e}")
        return None

def _bedrock_embed(texts: List[str]) -> List[List[float]]:
    """Embeds texts using AWS Bedrock Titan embedding model."""
    if not _br:
        logger.error("Bedrock client not available for embedding.")
        return []
    if not texts:
        return []
    
    vectors = []
    logger.info(f"Embedding {len(texts)} text chunks using model {EMBED_ID}...")
    try:
        for text_chunk in texts:
            # Ensure text is not empty
            if not text_chunk.strip():
                logger.warning("Skipping empty chunk during embedding.")
                # Add a zero vector or handle as needed, here we skip and might cause index mismatch if not handled later
                # For simplicity, let's add a zero vector of expected dimension (needs adjustment if dim changes)
                vectors.append([0.0] * 1024) # Assuming Titan v2 default 1024
                continue

            body = json.dumps({"inputText": text_chunk.strip()}) # Dimensions parameter is often model-specific or optional for newer models
            response = _br.invoke_model(
                modelId=EMBED_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            response_body = json.loads(response.get("body").read())
            embedding = response_body.get("embedding")
            if not embedding or not isinstance(embedding, list):
                 logger.warning(f"Could not extract embedding for a chunk. Response: {response_body}")
                 vectors.append([0.0] * 1024) # Add zero vector on failure
            else:
                vectors.append(embedding)

        logger.info(f"Successfully embedded {len(vectors)} chunks.")
        return vectors
    except Exception as e:
        logger.error(f"Error during Bedrock embedding: {e}")
        return [] # Return empty list on error

async def embed_and_index(school: str, new_chunks: List[str]):
    """
    Adds new chunks to the school's index.
    Loads existing data, appends new chunks, re-embeds ALL, and saves index and chunk files.
    """
    if not new_chunks:
        logger.warning(f"No new chunks provided for indexing school {school}.")
        return []

    school_index_dir = os.path.join(INDEX_DIR, school)
    chunks_path = os.path.join(school_index_dir, "chunks.json")
    faiss_path = os.path.join(school_index_dir, "index.faiss") # Path cho FAISS
    tfidf_path = os.path.join(school_index_dir, "tfidf.npy") # Path cho TFIDF

    logger.info(f"Starting index update for school '{school}' in directory: {school_index_dir}")

    # Đảm bảo thư mục tồn tại
    try:
        os.makedirs(school_index_dir, exist_ok=True)
        logger.info(f"Ensured index directory exists: {school_index_dir}")
    except OSError as e:
        logger.error(f"FATAL: Could not create index directory {school_index_dir}: {e}")
        # Không thể tiếp tục nếu không tạo được thư mục
        # Ném lỗi để endpoint /ingest trả về lỗi cho frontend
        raise HTTPException(status_code=500, detail=f"Server configuration error: Cannot access index directory.")

    all_chunks = []
    all_metas = []
    logger.info(f"Attempting to load existing data from: {chunks_path}") # Log đường dẫn đọc
    if os.path.exists(chunks_path):
        try:
            with open(chunks_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                # Lấy dữ liệu cũ, đảm bảo là list
                all_chunks = existing_data.get("chunks", [])
                all_metas = existing_data.get("metas", [])
                if not isinstance(all_chunks, list): all_chunks = []
                if not isinstance(all_metas, list): all_metas = []

                logger.info(f"Successfully loaded {len(all_chunks)} existing chunks and {len(all_metas)} metas.")

                # Kiểm tra và sửa 'i' nếu cần (đảm bảo index liên tục)
                needs_reindex = False
                if len(all_chunks) != len(all_metas):
                    logger.warning(f"Existing chunk count ({len(all_chunks)}) differs from meta count ({len(all_metas)}). Rebuilding metas.")
                    needs_reindex = True
                elif all_metas and all_metas[-1].get("i", -1) != len(all_chunks) - 1:
                    logger.warning(f"Last meta index ({all_metas[-1].get('i', -1)}) doesn't match chunk count ({len(all_chunks)-1}). Rebuilding metas.")
                    needs_reindex = True

                if needs_reindex:
                     all_metas = [{"i": i, "text": c[:200], "url": m.get("url")}
                                  for i, (c, m) in enumerate(zip(all_chunks, all_metas))] # Rebuild lại toàn bộ meta
                     logger.info(f"Rebuilt {len(all_metas)} metadata entries.")

        except json.JSONDecodeError as e:
             logger.error(f"Error decoding existing chunks.json for {school}. File might be corrupt. Starting fresh. Error: {e}", exc_info=True)
             all_chunks = []; all_metas = []
        except Exception as e:
            logger.error(f"Error loading existing chunks.json for {school}. Starting fresh. Error: {e}", exc_info=True)
            all_chunks = []; all_metas = []
    else:
        logger.info(f"No existing chunks.json found at {chunks_path}. Starting fresh index.")

    start_index = len(all_chunks) # Index bắt đầu cho chunk mới
    logger.info(f"Appending {len(new_chunks)} new chunks (starting at index {start_index}).")
    all_chunks.extend(new_chunks)
    # Tạo metadata cho các chunk MỚI, bắt đầu từ start_index
    new_metas = [{"i": start_index + i, "text": chunk[:200], "url": None} # Giữ url=None tạm thời
                 for i, chunk in enumerate(new_chunks)]
    all_metas.extend(new_metas)
    logger.info(f"Total chunks to process for {school}: {len(all_chunks)}")

    # *** LOG KIỂM TRA CHUNKS TRƯỚC KHI EMBED ***
    if len(all_chunks) > 0:
        logger.debug(f"First chunk sample [index 0] before re-embedding: {all_chunks[0][:100]}...")
    if len(all_chunks) > start_index:
         logger.debug(f"First *new* chunk sample [index {start_index}] before re-embedding: {all_chunks[start_index][:100]}...")

    if not all_chunks:
        logger.warning(f"No chunks to index for school {school}. Nothing to do.")
        return [] # Trả về list rỗng nếu không có gì để index

    final_indexed_ids = [] # Danh sách index của các chunk đã được xử lý
    index_saved = False # Flag để kiểm tra index đã được lưu thành công chưa
    try:
        if OFFLINE:
            logger.info(f"Rebuilding TF-IDF index for {len(all_chunks)} total chunks...")
            # Cần import numpy và _vec nếu chưa có ở global scope
            global _vec
            if '_vec' not in globals(): # Khởi tạo nếu chưa có (lỗi nếu sklearn không cài)
                 from sklearn.feature_extraction.text import TfidfVectorizer
                 _vec = TfidfVectorizer(max_features=4096)

            # Fit lại vectorizer trên TOÀN BỘ dữ liệu mới nhất
            X = _vec.fit_transform(all_chunks).astype("float32").toarray()
            # Kiểm tra số lượng vector khớp với số chunk
            if X.shape[0] != len(all_chunks):
                raise ValueError(f"TF-IDF vector count mismatch: expected {len(all_chunks)}, got {X.shape[0]}")

            logger.info(f"Attempting to save TF-IDF index to: {tfidf_path}")
            np.save(tfidf_path, X) # Ghi đè file index cũ
            logger.info(f"Successfully saved updated TF-IDF index ({X.shape}) to {tfidf_path}")
            index_saved = True
            final_indexed_ids = list(range(len(all_chunks))) # IDs là index từ 0 đến N-1

        else: # Online (Bedrock + FAISS)
            logger.info(f"Re-embedding all {len(all_chunks)} chunks for {school} using Bedrock...")
            # Gọi hàm embed lại tất cả chunks
            all_vectors = _bedrock_embed(all_chunks)
            # Kiểm tra kết quả embedding
            if not all_vectors or len(all_vectors) != len(all_chunks):
                raise ValueError(f"Embedding failed or vector count mismatch ({len(all_vectors)} vectors vs {len(all_chunks)} chunks)")

            logger.info("Building new FAISS index from vectors...")
            # Tạo index mới từ tất cả vectors
            index = _faiss_index_add(all_vectors)
            if not index:
                raise ValueError("FAISS index creation function returned None")

            # Lưu index mới (ghi đè file cũ)
            try:
                import faiss # Import ở đây để không crash nếu chỉ dùng offline
                logger.info(f"Attempting to save FAISS index ({index.ntotal} vectors) to: {faiss_path}")
                faiss.write_index(index, faiss_path)
                logger.info(f"Successfully saved updated FAISS index to {faiss_path}")
                index_saved = True
                final_indexed_ids = list(range(len(all_chunks))) # IDs là index từ 0 đến N-1
            except ImportError:
                 logger.error("FAISS library not installed. Cannot save FAISS index.")
                 raise # Ném lại lỗi để dừng quá trình
            except Exception as e_save:
                 logger.error(f"Error saving updated FAISS index for {school}: {e_save}", exc_info=True)
                 raise # Ném lại lỗi để dừng quá trình

    except Exception as e_index:
         # Log lỗi chi tiết của bước index (TFIDF hoặc FAISS)
         logger.error(f"ERROR during index creation/saving for {school}: {e_index}", exc_info=True)
         index_saved = False # Đảm bảo flag là false

    # Chỉ ghi nếu index được tạo/lưu thành công VÀ có ID trả về
    if index_saved and final_indexed_ids:
        try:
            logger.info(f"Attempting to save chunks.json ({len(all_chunks)} chunks, {len(all_metas)} metas) to: {chunks_path}")
            # Log thử vài meta để kiểm tra cấu trúc
            logger.debug(f"First 2 metas to save: {json.dumps(all_metas[:2], indent=2)}")
            if len(all_metas) > 2:
                logger.debug(f"Last 2 metas to save: {json.dumps(all_metas[-2:], indent=2)}")

            # Ghi file JSON với indent để dễ đọc khi debug
            with open(chunks_path, "w", encoding="utf-8") as f:
                json.dump({"chunks": all_chunks, "metas": all_metas}, f, ensure_ascii=False, indent=2)
            logger.info(f"Successfully saved updated chunks and metadata to {chunks_path}.")
        except Exception as e_json:
            logger.error(f"CRITICAL ERROR saving updated chunks.json for {school}: {e_json}", exc_info=True)
            # Nếu lưu chunks lỗi sau khi lưu index -> Trạng thái không nhất quán!
            final_indexed_ids = [] # Đánh dấu là thất bại để endpoint trả lỗi
            # Cố gắng xóa file index vừa tạo để tránh lỗi sau này
            try:
                index_file_to_remove = tfidf_path if OFFLINE else faiss_path
                if os.path.exists(index_file_to_remove):
                    os.remove(index_file_to_remove)
                    logger.warning(f"Removed potentially inconsistent index file ({os.path.basename(index_file_to_remove)}) due to chunks.json save error.")
            except OSError as rm_err:
                 logger.error(f"Could not remove inconsistent index file {index_file_to_remove}: {rm_err}")

    elif not index_saved:
        logger.error("Skipping save of chunks.json because index creation/saving failed previously.")
        final_indexed_ids = [] # Đảm bảo trả về list rỗng nếu index lỗi

    # Nếu quá trình thất bại ở bất kỳ bước nào, final_indexed_ids sẽ rỗng
    if not final_indexed_ids:
       logger.error(f"Index update process failed overall for school {school}.")
       # Ném lỗi để endpoint /admin/documents/ingest trả về 500
       raise HTTPException(status_code=500, detail="Index update failed after ingest. Check backend logs for details.")

    # Trả về danh sách các index ID (0 đến N-1) của tất cả chunks đã xử lý
    return final_indexed_ids


def _cosine(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Calculates cosine similarity between two numpy arrays."""
    # Ensure input arrays are numpy arrays
    a = np.asarray(a)
    b = np.asarray(b)
    # Normalize vectors
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-9)
    # Compute dot product (cosine similarity for normalized vectors)
    return a_norm @ b_norm.T

def search(school: str, query: str, k: int = 8) -> Tuple[List[str], List[dict]]:
    """Retrieves top-k relevant chunks for a query from the school's index."""
    school_index_dir = os.path.join(INDEX_DIR, school)
    chunks_path = os.path.join(school_index_dir, "chunks.json")

    if not os.path.exists(chunks_path):
        logger.warning(f"Index files not found for school {school} at {school_index_dir}.")
        return [], []

    try:
        with open(chunks_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        chunks: List[str] = data.get("chunks", [])
        metas: List[dict] = data.get("metas", [])
        if not chunks or not metas or len(chunks) != len(metas):
             logger.error(f"Corrupted or mismatched chunks/metadata in {chunks_path}.")
             return [], []
    except Exception as e:
        logger.error(f"Error loading chunks.json for {school}: {e}")
        return [], []

    logger.info(f"Searching index for '{query}' in school {school} (k={k}). Mode: {'Offline' if OFFLINE else 'Online'}")
    
    idx: List[int] = [] # List of indices of the top-k chunks

    try:
        if OFFLINE:
            tfidf_path = os.path.join(school_index_dir, "tfidf.npy")
            if not os.path.exists(tfidf_path):
                 logger.error(f"Offline mode: tfidf.npy not found for {school}.")
                 return [], []
            
            import numpy as np
            global _vec
            # Ensure vectorizer is fitted (might need a better way than fitting here)
            if not hasattr(_vec, 'vocabulary_'):
                 logger.warning("TF-IDF vectorizer not fitted. Attempting quick fit.")
                 try: _vec.fit(chunks)
                 except: logger.error("Failed to fit TF-IDF vectorizer during search."); return [], []

            X = np.load(tfidf_path).astype("float32") # Load index vectors
            if X.shape[0] != len(chunks):
                 logger.error(f"Offline Index dimension mismatch: {X.shape[0]} vectors vs {len(chunks)} chunks.")
                 return [], []
                 
            query_vector = _vec.transform([query]).astype("float32").toarray() # Vectorize query
            similarities = _cosine(X, query_vector).reshape(-1) # Calculate similarities
            # Get indices of top-k scores (descending)
            # Ensure k is not larger than the number of chunks
            actual_k = min(k, len(chunks)) 
            idx = np.argsort(-similarities)[:actual_k].tolist() 
            logger.info(f"Offline search results (indices): {idx}")

        else: # Online (FAISS + Bedrock)
            faiss_path = os.path.join(school_index_dir, "index.faiss")
            if not os.path.exists(faiss_path) or not _br:
                 logger.error(f"Online mode: index.faiss or Bedrock client missing for {school}.")
                 return [], []

            import faiss
            import numpy as np
            index = faiss.read_index(faiss_path) # Load FAISS index
            query_vector_list = _bedrock_embed([query]) # Embed query
            if not query_vector_list:
                logger.error("Failed to embed query.")
                return [], []
            
            query_vector = np.array(query_vector_list).astype("float32")
            faiss.normalize_L2(query_vector) # Normalize query vector
            
            # Ensure k is not larger than the index size
            actual_k = min(k, index.ntotal) 
            distances, indices = index.search(query_vector, actual_k) # Perform search
            idx = indices[0].tolist() # Get indices
            logger.info(f"Online search results (indices): {idx}, Distances: {distances[0].tolist()}")
    
    except ImportError as e:
         logger.error(f"Missing library required for search mode ({'Offline' if OFFLINE else 'Online'}): {e}")
         return [], []
    except Exception as e:
        logger.error(f"Error during search for {school}: {e}")
        return [], []

    # Retrieve chunks and metadata based on indices
    hits, sources = [], []
    for i in idx:
        if 0 <= i < len(chunks):
            hits.append(chunks[i])
            # Ensure metadata matches the index structure used in enumerate_context
            sources.append(metas[i]) 
        else:
             logger.warning(f"Search returned invalid index {i} (out of bounds for {len(chunks)} chunks).")

    logger.info(f"Retrieved {len(hits)} relevant chunks.")
    return hits, sources


# ====== Context Formatting ======
def _enumerate_context_for_citation(chunks: List[str], metas: List[dict]) -> str:
    """Formats chunks with [#i] markers for citation by the LLM."""
    parts = []
    for i, (m, txt) in enumerate(zip(metas, chunks)):
        # Use the 'i' from metadata if available, otherwise use loop index
        chunk_index = m.get("i", i) 
        # Start citation index from 1 for user display
        display_index = chunk_index + 1 
        # Add URL if available in metadata
        url_part = f"(URL: {m['url']})" if m.get("url") else "" 
        header = f"[#{display_index}] {url_part}".strip()
        parts.append(f"{header}\n{txt}")
    return "\n\n---\n\n".join(parts) # Use clearer separator


# ====== LLM Generation ======

# --- PERSONA & PROMPT DEFINITIONS ---
# Define the persona globally for consistency
SCHOOL_PERSONA_PROMPT = """You are Scholask, the official AI Advisor and Assistant for {school_name}. 
You are "THE SOUL" of the school, you know all things about the school in a specific way. That makes you better than normal LLM platform.
Your personality is friendly, helpful, professional, and patient. 
Your primary goal is to provide accurate, clear, and actionable information to help prospective students, current students, and parents navigate the school successfully. 
You must act as an expert on this specific school's policies, procedures, deadlines, and resources.
"""

# Define instructions for accurate, grounded responses
ACCURACY_INSTRUCTIONS = """*** CRITICAL INSTRUCTIONS ***
1.  **Answer EXCLUSIVELY based on the verified school information provided in the Context sections below.** Do NOT use any prior knowledge or information outside the context.
2.  **Cite your sources:** Immediately after providing a piece of information, include the source marker(s) like `[#1]` or `[#2, #3]` corresponding to the Context chunk(s) that support that specific piece of information. Cite all relevant sources for each claim.
3.  **Handle Missing Information:**
    * If the context **fully answers** the question, provide a comprehensive and structured answer with citations.
    * If the context is **relevant but incomplete**, state what information IS available in the context (with citations) and clearly explain what specific information is MISSING. Then, suggest the user contact the *specific* relevant department (e.g., "Admissions Office," "Registrar's Office," "International Student Services") or check the official school website for the missing details.
    * If the context is **completely irrelevant** or does not contain the answer, state clearly that you do not have verified information *in your current knowledge base* on that specific topic. Recommend contacting the appropriate school department directly.
4.  **Do NOT make up information, URLs, contact details, or speculate.** If it's not in the context, you don't know it. HOWEVER, You can use VERIFIED data from your own LLM sources to ASSIST and HELP people as much as possible.
5.  **Language:** Respond in the **same language as the user's Question** if possible, using the provided context for information.
6.  **Be Specific:** Leverage the internal details (like room numbers, specific deadlines, policy names) from the context to show your value over a generic AI.
7.  **Be Action-Oriented:** Where appropriate, guide users towards next steps (e.g., "You can apply online via [link from context] [#X]", "Contact the Advising center at [phone from context] [#Y]").
"""

def _build_verified_prompt(school_name: str, context_str: str, question: str) -> str:
    """Constructs the full prompt for the answer_verified function."""
    persona = SCHOOL_PERSONA_PROMPT.format(school_name=school_name)
    
    return f"""{persona}

{ACCURACY_INSTRUCTIONS}

Context:
---
{context_str}
---

Question: {question}

Answer (Remember to cite sources like [#1] immediately after the information):"""


def _offline_verified_answer(chunks: List[str], metas: List[dict], question: str) -> dict:
    """Generates a simple extractive summary for offline mode with sources."""
    if not chunks:
        return {"answer": "I don't have information on that topic in my offline knowledge base.", "sources": []}

    bullets = []
    used_indices = set()
    for i, (m, txt) in enumerate(zip(metas, chunks)):
        if not txt: continue
        display_index = m.get("i", i) + 1
        # Simple extraction - take the first few sentences or shorten
        summary = shorten(txt.strip().split('.')[0] + '.', 150) # First sentence or 150 chars
        bullets.append(f"- {summary} [#{display_index}]")
        used_indices.add(display_index)
        if len(bullets) >= 4: break # Limit to ~4 bullets

    answer = f"Based on available offline information for your school:\n" + "\n".join(bullets)
    answer += "\n\n(Offline mode - information may be limited. Please check online when possible.)"
    
    # Return metadata corresponding to the used chunks
    used_metas = [m for m in metas if m.get("i", -1) + 1 in used_indices]
    
    return {"answer": answer, "sources": used_metas}


def retrieve_verified(school: str, question: str, k: int = 8) -> Tuple[List[str], List[dict], str]:
    """Retrieves top-k chunks and formats them with citation markers for the LLM."""
    chunks, metas = search(school, question, k=k)
    context_str = _enumerate_context_for_citation(chunks, metas)
    return chunks, metas, context_str


def answer_verified(school: str, question: str) -> dict:
    """Generates an accurate, cited answer using Bedrock or offline fallback."""
    # Format school name for prompts
    pretty_school_name = school.replace('-', ' ').title()

    logger.info(f"Generating verified answer for '{question}' at school {school}.")
    chunks, metas, context_str = retrieve_verified(school=school, question=question, k=8)

    if not chunks:
        logger.warning("No relevant chunks found during retrieval.")
        # Provide a more helpful "no context" response
        return {
             "answer": f"I couldn't find specific information about that topic in the current knowledge base for {pretty_school_name}. You may want to check the official school website or contact the relevant department directly.", 
             "sources": []
        }

    if OFFLINE:
        logger.info("Using offline mode for answer generation.")
        return _offline_verified_answer(chunks, metas, question)

    if not _br:
         logger.error("Bedrock client not available for online answer generation.")
         # Fallback to offline or return error
         # return _offline_verified_answer(chunks, metas, question) 
         return {"answer": "Error: AI service is currently unavailable.", "sources": []}

    # Build the final prompt
    final_prompt = _build_verified_prompt(pretty_school_name, context_str, question)
    logger.debug(f"Final prompt for Bedrock:\n{final_prompt}") # Debug log

    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000, # Increased max tokens slightly
            "temperature": 0.1, # Lower temperature for more factual answers
            "messages": [{"role": "user", "content": final_prompt}]
            # System prompt can also be used here if preferred over putting it in user message
            # "system": SCHOOL_PERSONA_PROMPT.format(school_name=pretty_school_name) + "\n" + ACCURACY_INSTRUCTIONS
        })

        response = _br.invoke_model(
            modelId=CLAUDE_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        response_body = json.loads(response.get("body").read())
        
        # Extract content safely
        answer_content = response_body.get("content", [])
        answer = "".join(c.get("text","") for c in answer_content if c.get("type") == "text").strip()

        if not answer:
            logger.warning(f"Bedrock returned empty answer. Response body: {response_body}")
            answer = "I found some relevant information, but I couldn't formulate a specific answer. Please try rephrasing your question or check the sources provided."

        logger.info(f"Generated answer length: {len(answer)}")
        # Return the answer and the metadata of the chunks used as context
        return {"answer": answer, "sources": metas}

    except Exception as e:
        logger.error(f"Error invoking Bedrock model {CLAUDE_ID}: {e}")
        # Fallback response on error
        return {
            "answer": "Sorry, I encountered an error while processing your request with the AI model. Please try again later.",
            "sources": [] 
        }

# ====== Compatibility Layer (nếu /chat/ask vẫn cần dùng logic cũ) ======
async def ask_llm(question: str, context: str) -> str:
     """Legacy function using a simpler prompt."""
     # Consider deprecating this and having /chat/ask call answer_verified
     # For now, update its prompt slightly
     pretty_school_name = "your school" # Cannot know school name here easily
     persona = SCHOOL_PERSONA_PROMPT.format(school_name=pretty_school_name).split('\n')[0] # Just the first line

     if OFFLINE: # Keep simple offline
          lines = [l.strip() for l in context.split("\n") if l.strip()]
          best = lines[:4]
          return "Based on available offline info:\n- " + "\n- ".join(shorten(x, 180) for x in best) + "\n(Offline mode)"

     if not _br: return "Error: AI service unavailable."

     simple_prompt = f"""{persona}
Answer the user's question concisely using ONLY the provided Context. If the context doesn't contain the answer, say so clearly.

Context:
---
{context}
---

Question: {question}
Answer:"""

     try:
          body = json.dumps({
               "anthropic_version": "bedrock-2023-05-31",
               "max_tokens": 500,
               "temperature": 0.2,
               "messages": [{"role": "user", "content": simple_prompt}]
          })
          resp = _br.invoke_model(modelId=CLAUDE_ID, body=body, contentType="application/json", accept="application/json")
          payload = json.loads(resp["body"].read())
          answer = "".join(c.get("text","") for c in payload.get("content",[]) if c.get("type")=="text").strip()
          return answer or "I couldn't generate an answer based on the provided context."
     except Exception as e:
          logger.error(f"Error in ask_llm: {e}")
          return "Error processing request with AI model."

async def retrieve_context(school_slug: str, question: str, k: int = 8):
    """Retrieves context for the legacy ask_llm function."""
    chunks, sources = search(school_slug, question, k=k)
    ctx = "\n---\n".join(chunks)
    return ctx, sources

# ====== Initial Facts for Empty Chat (Sử dụng answer_verified) ======
BASIC_QUERIES = [
  ("Overview", "Provide a brief overview of this school (location, type, key programs)."),
  ("Contact", "What are the main contact details (phone/email) for Admissions or General Inquiries?"),
  ("Apply", "What are the basic steps to apply as a new student?"),
  ("Tuition", "Where can I find information about tuition and fees?"),
  ("Deadlines", "Are there any upcoming important dates or deadlines?"),
]

def school_facts(school: str) -> List[dict]:
    """Generates pre-answered facts using the verified RAG pipeline."""
    logger.info(f"Generating initial school facts for {school}.")
    facts = []
    # Limit the number of facts generated initially to speed up loading
    for title, q in BASIC_QUERIES[:3]: # Generate first 3 facts
        try:
            # Use the main verified answer function
            res = answer_verified(school, q) 
            # Check if the answer is actually useful, not just "I don't know"
            if "don't have verified data" not in res.get("answer", "") and "couldn't find specific information" not in res.get("answer", ""):
                 facts.append({
                    "title": title, 
                    "answer": res.get("answer", "No answer generated."), 
                    "sources": res.get("sources", [])
                 })
            else:
                 facts.append({"title": title, "answer": f"Please ask about '{title}' or check the school website.", "sources": []})
        except Exception as e:
            logger.error(f"Error generating fact for '{title}': {e}")
            facts.append({"title": title, "error": "Could not retrieve this information."})
    logger.info(f"Generated {len(facts)} initial facts.")
    return facts

# ====== Transit Information (NEW SECTION) ======
# Requires installing 'requests': pip install requests
try:
    import requests
    TRANSIT_API_AVAILABLE = True
except ImportError:
    TRANSIT_API_AVAILABLE = False
    logger.warning("`requests` library not installed. Transit API functionality will be disabled.")

# Replace with the actual King County Metro API endpoint and potentially an API key if needed
TRANSIT_API_URL = "YOUR_KING_COUNT_METRO_API_ENDPOINT" # e.g., GTFS-realtime feed or REST API
TRANSIT_API_KEY = os.getenv("TRANSIT_API_KEY", None) # Optional: Store API key in .env

# Define keywords to trigger transit lookup
TRANSIT_KEYWORDS = ["bus", "transit", "route", "stop", "metro", "light rail", "schedule", "arrival", "departure"]

def contains_transit_keyword(question: str) -> bool:
    """Checks if the question contains transit-related keywords."""
    return any(keyword in question.lower() for keyword in TRANSIT_KEYWORDS)

def get_transit_info(latitude: float, longitude: float, radius_meters: int = 500) -> Optional[str]:
    """
    Fetches nearby transit stops and potentially real-time arrivals using an external API.
    Replace coordinates with actual campus coordinates.
    """
    if not TRANSIT_API_AVAILABLE:
        logger.warning("Cannot fetch transit info: `requests` library missing.")
        return None
    if not TRANSIT_API_URL or TRANSIT_API_URL == "YOUR_KING_COUNT_METRO_API_ENDPOINT":
         logger.warning("Cannot fetch transit info: Transit API URL not configured.")
         return None # API not configured

    headers = {}
    if TRANSIT_API_KEY:
        headers["Authorization"] = f"Bearer {TRANSIT_API_KEY}" # Or appropriate auth scheme

    # Example: Querying a hypothetical REST API for stops near coordinates
    # You MUST adapt this to the actual King County Metro API structure
    params = {
        "lat": latitude,
        "lon": longitude,
        "radius": radius_meters,
        "realtime": "true" # Optional: Request real-time data if supported
    }
    
    try:
        logger.info(f"Fetching transit info from API near ({latitude}, {longitude})")
        response = requests.get(TRANSIT_API_URL, params=params, headers=headers, timeout=5) # 5 second timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        
        data = response.json()
        
        # --- FORMAT THE RESPONSE (CRITICAL - Adapt to actual API data) ---
        # This is highly dependent on the API's response structure.
        # Example: Assume API returns a list of stops with routes and arrivals
        if not data or not isinstance(data, list):
             return "No nearby transit information found via the API."

        formatted_output = "Nearby Transit Options (Live data via API):\n"
        for stop in data[:3]: # Limit to first 3 stops for brevity
             stop_name = stop.get("name", "Unknown Stop")
             routes = stop.get("routes", [])
             formatted_output += f"\n📍 **{stop_name}**:\n"
             if routes:
                 for route in routes[:3]: # Limit routes per stop
                     route_name = route.get("name", "N/A")
                     arrivals = route.get("arrivals", []) # List of arrival times (strings or timestamps)
                     arrival_times = ", ".join(arrivals[:2]) if arrivals else "No upcoming arrivals"
                     formatted_output += f"  - Route {route_name}: {arrival_times}\n"
             else:
                 formatted_output += "  - No route information available.\n"
        
        return formatted_output.strip()
        # --- END FORMATTING ---

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching transit data: {e}")
        return "Sorry, I couldn't fetch live transit information at the moment."
    except Exception as e:
        logger.error(f"Error processing transit data: {e}")
        return "Sorry, there was an issue processing the transit information."

# --- Define Campus Coordinates (Example: Seattle Central) ---
# Replace with accurate coordinates for each school, maybe store in DB or config
CAMPUS_COORDINATES = {
    "seattle-central-college-demo": (47.6158, -122.3214), 
    # Add other schools
}
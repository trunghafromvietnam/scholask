from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException 
from pydantic import BaseModel
from app import rag 
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

class AskIn(BaseModel):
    school: str
    question: str

@router.post("/ask")
async def ask(in_: AskIn):
    school_slug = in_.school.strip()
    question = in_.question.strip()

    if not school_slug or not question:
        raise HTTPException(status_code=400, detail="School slug and question are required.")

    # --- TRANSIT CHECK ---
    if rag.contains_transit_keyword(question):
        logger.info(f"Transit keyword detected in question for {school_slug}.")
        coords = rag.CAMPUS_COORDINATES.get(school_slug)
        if coords:
             # Gọi hàm transit API (đồng bộ, có thể đổi sang async nếu cần)
             transit_answer = rag.get_transit_info(latitude=coords[0], longitude=coords[1])
             if transit_answer:
                  # Trả về câu trả lời từ API transit, không cần gọi RAG/LLM
                  return {"answer": transit_answer, "sources": [{"type": "api", "name": "Transit API"}]} 
             else:
                  # API lỗi hoặc không cấu hình -> fallback về RAG
                  logger.warning("Transit API call failed or disabled, falling back to RAG.")
        else:
             logger.warning(f"No coordinates configured for school {school_slug}, falling back to RAG for transit question.")
    # --- END TRANSIT CHECK ---

    # Nếu không phải câu hỏi transit hoặc transit lỗi -> Dùng RAG pipeline
    try:
        # Sử dụng hàm answer_verified với prompt đã cải thiện
        verified_response = rag.answer_verified(school_slug, question) 
        return verified_response
    except Exception as e:
        # Bắt lỗi chung từ RAG pipeline
        logger.error(f"Error during RAG processing for {school_slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat request.")


# --- WebSocket Endpoint (Giữ nguyên hoặc cải thiện tương tự) ---
# Hiện tại WS endpoint đang dùng logic ask_llm cũ. 
# Cần nâng cấp để:
# 1. Kiểm tra transit keyword.
# 2. Nếu là transit, gọi API transit và gửi kết quả.
# 3. Nếu không, gọi answer_verified và gửi kết quả (không streaming).
# Streaming thực sự với RAG + LLM phức tạp hơn (cần yield từ Bedrock).
# CHO HACKATHON: Có thể giữ WS trả lời không streaming như hiện tại cho đơn giản.

@router.websocket("/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            import json # Cần import json ở đây
            try:
                data = json.loads(raw)
                school_slug = data.get("school", "").strip()
                question = data.get("question", "").strip()

                if not school_slug or not question:
                    await ws.send_text(json.dumps({"error": "school and question required"}))
                    continue

                # --- ADD TRANSIT CHECK TO WEBSOCKET ---
                is_transit = rag.contains_transit_keyword(question)
                transit_answer = None
                if is_transit:
                    logger.info(f"WS: Transit keyword detected for {school_slug}.")
                    coords = rag.CAMPUS_COORDINATES.get(school_slug)
                    if coords:
                        transit_answer = rag.get_transit_info(latitude=coords[0], longitude=coords[1])
                    else:
                         logger.warning(f"WS: No coordinates for {school_slug}.")
                
                if transit_answer:
                     await ws.send_text(json.dumps({"answer": transit_answer, "sources": [{"type": "api", "name": "Transit API"}]}))
                     continue # Chuyển sang vòng lặp chờ message tiếp theo
                # --- END WS TRANSIT CHECK ---

                # Nếu không phải transit -> Gọi RAG (answer_verified)
                verified_response = rag.answer_verified(school_slug, question)
                await ws.send_text(json.dumps(verified_response))

            except json.JSONDecodeError:
                 await ws.send_text(json.dumps({"error": "Invalid JSON message"}))
            except Exception as e:
                 logger.error(f"Error processing WebSocket message: {e}")
                 await ws.send_text(json.dumps({"error": "Failed to process request"}))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected.")
    except Exception as e:
         # Log lỗi không mong muốn khác
         logger.error(f"Unexpected error in WebSocket handler: {e}")
    finally:
         # Đảm bảo đóng kết nối nếu có lỗi
         logger.info("Closing WebSocket connection.")
         # await ws.close() # FastAPI tự xử lý khi ra khỏi try/except
         pass


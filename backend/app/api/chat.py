from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService
from app.llm import create_llm_provider

router = APIRouter()

_chat_service: ChatService | None = None


def _get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        try:
            provider = create_llm_provider()
            _chat_service = ChatService(provider)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"LLM service unavailable: {e}",
            )
    return _chat_service


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        service = _get_chat_service()
        response = await service.send_message(request.message)
        return ChatResponse(response=response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {e}")

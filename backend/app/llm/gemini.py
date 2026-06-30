import google.generativeai as genai

from app.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider (free tier)."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=model,
            system_instruction=None,
        )

    async def generate(self, message: str, system_prompt: str) -> str:
        chat = self.model.start_chat(history=[])
        response = await chat.send_message_async(
            f"{system_prompt}\n\nПользователь: {message}"
        )
        return response.text

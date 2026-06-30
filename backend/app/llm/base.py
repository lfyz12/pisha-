from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(self, message: str, system_prompt: str) -> str:
        """Generate a response from the LLM.

        Args:
            message: The user's message.
            system_prompt: The system prompt to prepend.

        Returns:
            The generated response text.
        """

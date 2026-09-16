from abc import ABC, abstractmethod
from typing import List, Dict, Any, Type, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_structured(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        """
        Query LLM to extract data conforming strictly to a Pydantic model.
        """
        pass

    @abstractmethod
    def generate_text(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Query LLM to generate unstructured or formatted text response, returning the text and usage logs.
        """
        pass

class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate a 384-dimensional vector embedding for the input text.
        """
        pass

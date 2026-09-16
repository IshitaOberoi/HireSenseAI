import hashlib
import logging
import random
from typing import List
from app.core.config import settings
from app.providers.base import BaseEmbeddingProvider

logger = logging.getLogger("hiresense-ai.providers.embedding")

class EmbeddingProviderError(RuntimeError):
    """Raised when the required real embedding runtime/model is unavailable."""


class LocalEmbeddingProvider(BaseEmbeddingProvider):
    dimension = 384

    def __init__(self):
        self.model = None

    def _load_model(self):
        if self.model is not None:
            return self.model
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded SentenceTransformer model all-MiniLM-L6-v2")
            return self.model
        except Exception as exc:
            raise EmbeddingProviderError(
                "Unable to load all-MiniLM-L6-v2. Install sentence-transformers and CPU PyTorch, "
                "then ensure the model can be downloaded or is cached."
            ) from exc

    def get_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise EmbeddingProviderError("Cannot embed empty resume content")
        if settings.AI_MOCK_MODE:
            return self._generate_hash_mock_embedding(text)
        model = self._load_model()
        try:
            vector = model.encode(text, normalize_embeddings=True).tolist()
        except Exception as exc:
            raise EmbeddingProviderError("all-MiniLM-L6-v2 failed to encode resume content") from exc
        if len(vector) != self.dimension:
            raise EmbeddingProviderError(
                f"all-MiniLM-L6-v2 returned {len(vector)} dimensions; expected {self.dimension}"
            )
        return vector

    def _generate_hash_mock_embedding(self, text: str) -> List[float]:
        """Deterministic fixture vector, permitted only when AI_MOCK_MODE=true."""
        text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
        seed = int(text_hash[:8], 16)
        
        rng = random.Random(seed)
        vector = [rng.uniform(-1.0, 1.0) for _ in range(self.dimension)]
        
        # Normalize the vector to unit length
        norm = sum(x**2 for x in vector)**0.5
        if norm > 0:
            vector = [x / norm for x in vector]
        return vector

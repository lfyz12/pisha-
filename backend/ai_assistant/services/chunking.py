"""Splitting of extracted document text into overlapping chunks."""

from __future__ import annotations


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    """Split text into chunks of at most ``chunk_size`` characters.

    Whitespace is normalized first (all runs collapse to single spaces).
    Chunks end on word boundaries where possible, and each following chunk
    starts with the last ``overlap`` characters of the previous one as
    trailing context, so ``chunk[i + 1]`` always begins with the tail of
    ``chunk[i]``. Empty or whitespace-only input returns an empty list.

    Raises:
        ValueError: if ``chunk_size`` or ``overlap`` are not positive.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap <= 0:
        raise ValueError("overlap must be positive")

    normalized = " ".join(text.split())
    if not normalized:
        return []
    if len(normalized) <= chunk_size:
        return [normalized]

    overlap = min(overlap, chunk_size - 1)
    chunks = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(start + chunk_size, length)
        if end < length:
            boundary = normalized.rfind(" ", start, end)
            if boundary > start:
                end = boundary
        chunks.append(normalized[start:end])
        if end >= length:
            break
        start = max(end - overlap, start + 1)
    return chunks

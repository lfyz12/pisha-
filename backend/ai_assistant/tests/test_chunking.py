"""Tests for ai_assistant.services.chunking."""

from django.test import SimpleTestCase

from ai_assistant.services.chunking import chunk_text


def make_long_text(words: int = 1000) -> str:
    return " ".join(f"word{i:04d}" for i in range(words))


class ChunkTextTests(SimpleTestCase):
    def test_empty_and_whitespace_input_returns_empty_list(self):
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_text("   \n\t  "), [])

    def test_short_input_returns_single_chunk(self):
        self.assertEqual(chunk_text("hello world"), ["hello world"])

    def test_whitespace_is_normalized(self):
        self.assertEqual(chunk_text("a  b\n\nc   d"), ["a b c d"])

    def test_chunk_sizes_respect_bounds(self):
        chunks = chunk_text(make_long_text(), chunk_size=500, overlap=50)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 500 for chunk in chunks))

    def test_chunks_end_on_word_boundaries(self):
        text = make_long_text()
        for chunk in chunk_text(text, chunk_size=500, overlap=50)[:-1]:
            self.assertTrue(text.startswith(" ", text.find(chunk) + len(chunk)))

    def test_overlap_continuity(self):
        overlap = 50
        chunks = chunk_text(make_long_text(), chunk_size=500, overlap=overlap)
        for previous, current in zip(chunks, chunks[1:]):
            self.assertTrue(current.startswith(previous[-overlap:]))

    def test_all_words_are_preserved_across_chunks(self):
        text = make_long_text(300)
        chunks = chunk_text(text, chunk_size=200, overlap=30)
        self.assertEqual(chunks[0].split()[0], "word0000")
        self.assertEqual(chunks[-1].split()[-1], "word0299")

    def test_short_input_never_raises(self):
        self.assertEqual(chunk_text("hi", chunk_size=1000, overlap=150), ["hi"])

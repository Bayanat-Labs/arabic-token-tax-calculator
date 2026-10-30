import json
import os

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session")
def root():
    return ROOT


@pytest.fixture(scope="session")
def fixtures():
    with open(os.path.join(ROOT, "fixtures", "fixtures.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


class FakeEngine:
    """A whitespace 'tokenizer' with fixed revision, for tests that need no tokenizer files."""

    def __init__(self, id_, per_word=1):
        self.id, self.label, self.revision, self.library = id_, id_, "test", "test"
        self.per_word = per_word

    def encode(self, texts):
        return [list(range(len(t.split()) * self.per_word)) for t in texts]

    def count(self, text):
        return len(self.encode([text])[0])

    def decode(self, ids):
        return ""


@pytest.fixture
def fake_engines():
    return {"o200k_base": FakeEngine("o200k_base", 2), "qwen3.5": FakeEngine("qwen3.5", 3)}

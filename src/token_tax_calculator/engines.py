"""Load the tokenizers of the registry and encode text.

Three routes, as in the Arabic Token-Tax Index:
  tiktoken       an encoding shipped with the tiktoken package (encode_ordinary: no special tokens)
  hf             a tokenizer.json file from a Hugging Face model repository at a pinned revision,
                 run with the `tokenizers` library (add_special_tokens=False)
  sentencepiece  a tokenizer.model file at a pinned revision, run with `sentencepiece` (no BOS/EOS)

Tokenizer files are downloaded on first use (tokenizer files, never model weights) and checked
against the SHA-256 recorded in the registry. No model code is run.
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, field
from typing import Callable, Sequence

USER_AGENT = "BayanatLabs-OpenData/1.0 (+https://bayanatlabs.com/open; hello@bayanatlabs.com)"


class TokenizerFileMismatch(RuntimeError):
    pass


@dataclass
class Engine:
    id: str
    label: str
    revision: str
    library: str
    _encode: Callable[[Sequence[str]], list[list[int]]] = field(repr=False)
    _decode: Callable[[list[int]], str] = field(repr=False)

    def encode(self, texts: Sequence[str]) -> list[list[int]]:
        return self._encode(list(texts))

    def count(self, text: str) -> int:
        return len(self.encode([text])[0])

    def decode(self, ids: list[int]) -> str:
        return self._decode(ids)


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _download(repo_id: str, filename: str, revision: str, expected_sha256: str) -> str:
    local = os.environ.get("TOKEN_TAX_TOKENIZER_DIR")
    if local:
        path = os.path.join(local, repo_id.replace("/", "__"), filename)
        if os.path.exists(path):
            if _sha256_file(path) != expected_sha256:
                raise TokenizerFileMismatch(f"{path}: SHA-256 differs from the registry")
            return path
    from huggingface_hub import hf_hub_download

    path = hf_hub_download(repo_id=repo_id, filename=filename, revision=revision, user_agent=USER_AGENT)
    got = _sha256_file(path)
    if got != expected_sha256:
        raise TokenizerFileMismatch(f"{repo_id}@{revision}/{filename}: SHA-256 {got} differs from the registry")
    return path


def load(entry: dict) -> Engine:
    """Load one tokenizer from a registry entry."""
    route = entry["route"]
    if route == "tiktoken":
        import tiktoken

        enc = tiktoken.get_encoding(entry["encoding"])

        def _decode(ids: list[int]) -> str:
            return enc.decode_bytes(ids).decode("utf-8", errors="replace")

        return Engine(entry["id"], entry["label"], f"{entry['encoding']} (tiktoken {tiktoken.__version__})",
                      f"tiktoken {tiktoken.__version__}",
                      lambda texts: enc.encode_ordinary_batch(texts), _decode)
    if route == "hf":
        import tokenizers

        path = _download(entry["repo_id"], entry["file"], entry["revision"], entry["file_sha256"])
        tok = tokenizers.Tokenizer.from_file(path)

        def _encode(texts: list[str]) -> list[list[int]]:
            return [e.ids for e in tok.encode_batch(texts, add_special_tokens=False)]

        return Engine(entry["id"], entry["label"], f"{entry['repo_id']}@{entry['revision']}",
                      f"tokenizers {tokenizers.__version__}", _encode,
                      lambda ids: tok.decode(ids, skip_special_tokens=False))
    if route == "sentencepiece":
        import sentencepiece as spm

        path = _download(entry["repo_id"], entry["file"], entry["revision"], entry["file_sha256"])
        sp = spm.SentencePieceProcessor(model_file=path)
        return Engine(entry["id"], entry["label"], f"{entry['repo_id']}@{entry['revision']}",
                      f"sentencepiece {spm.__version__}",
                      lambda texts: sp.encode(texts), lambda ids: sp.decode(ids))
    raise ValueError(f"unknown route: {route!r}")

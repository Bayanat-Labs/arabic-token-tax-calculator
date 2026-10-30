"""Words, characters and bytes, standard library only.

Words follow wordcount-v1 of the Arabic Token-Tax Index: maximal runs of letters (L*), marks (M*)
and decimal digits (Nd); an apostrophe (' or U+2019) or a hyphen between two word characters, and
a comma, full stop, U+066B or U+066C between two digits, stay inside the word. Arabic clitics are
not split, so Arabic text has fewer, longer words than its English parallel.
Characters are Unicode code points that are not white space. Bytes are UTF-8 bytes.
Text is measured as written: no normalisation is applied.
"""
from __future__ import annotations

import hashlib
import unicodedata

WORDCOUNT_SPEC = "wordcount-v1"
_JOIN_ANY = {"'", "’", "-"}
_JOIN_DIGITS = {",", ".", "٫", "٬"}


def _is_word_char(ch: str) -> bool:
    cat = unicodedata.category(ch)
    return cat[0] in ("L", "M") or cat == "Nd"


def _is_digit(ch: str) -> bool:
    return unicodedata.category(ch) == "Nd"


def words(text: str) -> list[str]:
    out: list[str] = []
    cur: list[str] = []
    n = len(text)
    for i, ch in enumerate(text):
        if _is_word_char(ch):
            cur.append(ch)
            continue
        if cur and i + 1 < n:
            nxt = text[i + 1]
            if ch in _JOIN_ANY and _is_word_char(nxt):
                cur.append(ch)
                continue
            if ch in _JOIN_DIGITS and _is_digit(cur[-1]) and _is_digit(nxt):
                cur.append(ch)
                continue
        if cur:
            out.append("".join(cur))
            cur = []
    if cur:
        out.append("".join(cur))
    return out


def word_count(text: str) -> int:
    return len(words(text))


# White space for the character count: the code points for which Python's str.isspace() is true
# (Unicode 15.0). The browser page uses the same list.
WHITESPACE = frozenset(map(chr, (
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x85, 0xA0, 0x1680,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A,
    0x2028, 0x2029, 0x202F, 0x205F, 0x3000,
)))


def char_count(text: str) -> int:
    return sum(1 for ch in text if ch not in WHITESPACE)


def byte_count(text: str) -> int:
    return len(text.encode("utf-8"))


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def stats(text: str) -> dict:
    return {"words": word_count(text), "chars": char_count(text), "bytes": byte_count(text), "sha256": sha256_text(text)}

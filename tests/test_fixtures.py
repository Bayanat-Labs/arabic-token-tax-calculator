import hashlib
import json
import os
import unicodedata
from collections import Counter

from token_tax_calculator.calc import load_registry
from token_tax_calculator.cli import fixture_texts


def test_fixture_rows(fixtures, root):
    assert len(fixtures) == 120
    assert len({r["row_id"] for r in fixtures}) == 120
    with open(os.path.join(root, "fixtures", "slices.json"), encoding="utf-8") as f:
        slices = json.load(f)
    assert len(slices) == 12
    assert Counter(r["slice"] for r in fixtures) == {s["slice"]: 10 for s in slices}
    for r in fixtures:
        for k in ("text_ar", "text_en"):
            assert r[k] == unicodedata.normalize("NFC", r[k]) and r[k].strip() == r[k] and r[k]
        if r["slice"] != "arabizi":
            assert any("؀" <= ch <= "ۿ" for ch in r["text_ar"]), r["row_id"]


def test_sha256sums(root):
    d = os.path.join(root, "fixtures")
    with open(os.path.join(d, "SHA256SUMS"), encoding="utf-8") as f:
        lines = [line.split() for line in f if line.strip()]
    assert lines
    for digest, name in lines:
        with open(os.path.join(d, name), "rb") as f:
            assert hashlib.sha256(f.read()).hexdigest() == digest, name


def test_expected_counts_and_ids(fixtures, root):
    with open(os.path.join(root, "fixtures", "expected_counts.json"), encoding="utf-8") as f:
        counts = json.load(f)
    with open(os.path.join(root, "fixtures", "expected_ids.json"), encoding="utf-8") as f:
        ids = json.load(f)
    _texts, keys = fixture_texts(fixtures)
    assert len(keys) == 242
    reg = {t["id"] for t in load_registry()["tokenizers"]}
    assert set(counts["tokenizers"]) == reg == set(ids["tokenizers"])
    for tid in reg:
        c, i = counts["tokenizers"][tid]["counts"], ids["tokenizers"][tid]["ids"]
        assert list(c) == keys
        assert all(len(i[k]) == c[k] for k in keys), tid

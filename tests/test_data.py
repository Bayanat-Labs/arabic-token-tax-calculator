import re

from token_tax_calculator.calc import load_prices, load_registry

HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")


def test_registry():
    reg = load_registry()
    toks = reg["tokenizers"]
    assert len(toks) == 12
    assert len({t["id"] for t in toks}) == 12
    for t in toks:
        assert t["route"] in ("tiktoken", "hf", "sentencepiece")
        if t["route"] != "tiktoken":
            assert HEX40.match(t["revision"]), t["id"]
            assert HEX64.match(t["file_sha256"]), t["id"]
        # the browser page includes MIT and Apache-2.0 tokenizers, and only those
        assert t["bundled"] == (t["licence"] in ("MIT", "Apache-2.0")), t["id"]
        assert t["licence_url"].startswith("https://")
        ref = t["index_reference"]
        assert ref["ratio_ci95"][0] <= ref["ratio"] <= ref["ratio_ci95"][1]
        assert t["models"]
    assert sum(t["bundled"] for t in toks) == 9
    basis = {t["id"]: t["models_basis"] for t in toks}
    assert basis["cl100k_base"] == "tiktoken 0.14.0 model-to-encoding table"
    assert basis["o200k_base"].startswith("tiktoken 0.14.0 model-to-encoding table; gpt-oss models checked")
    for t in toks:
        # a basis that names checked models only on rows that list more than the source model
        if t["route"] != "tiktoken":
            assert ("gave the same counts" in t["models_basis"]) == (len(t["models"]) > 1), t["id"]


def test_prices():
    reg = {t["id"] for t in load_registry()["tokenizers"]}
    p = load_prices()
    assert p["price_date"] == "2026-10-30"
    assert len(p["prices"]) == 7
    for row in p["prices"]:
        assert row["tokenizer_id"] in reg
        assert row["currency"] == "USD"
        assert row["input_usd_per_mtok"] > 0 and row["output_usd_per_mtok"] > 0
        assert row["source_url"].startswith("https://")
        assert row["checked_at"].startswith(p["price_date"])
        assert HEX64.match(row["page_sha256"])
        # a promotional price says so, and no row calls itself a standard rate
        assert bool(row["promotional_through"]) == bool(row["price_note"]), row["model"]
        if row["promotional_through"]:
            assert row["price_note"].startswith("promotional price, at least through ")
            assert row["tier"].startswith("Promotional price")
        assert "standard rate" not in row["tier"].lower()
    assert "standard rate" not in p["notes"].lower()
    assert sum(1 for r in p["prices"] if r["promotional_through"]) == 1
    for row in p["no_price"]:
        assert row["tokenizer_id"] in reg

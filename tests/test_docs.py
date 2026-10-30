"""Numbers stated in the page card and the page text match the released files."""
import json
import os

from token_tax_calculator.calc import load_prices, load_registry

WORDS = {9: "nine", 12: "twelve"}


def test_space_card_numbers(root, fixtures):
    with open(os.path.join(root, "web", "README.space.md"), encoding="utf-8") as f:
        card = f.read()
    toks = load_registry()["tokenizers"]
    bundled = [t for t in toks if t["bundled"]]
    assert f"for {WORDS[len(bundled)]} LLM tokenizers" in card
    assert f"each of its {WORDS[len(bundled)]} tokenizers" in card
    assert f"On {len(fixtures)} fixture texts" in card
    for t in bundled:
        assert t["label"] in card, t["label"]
    for t in toks:
        if not t["bundled"]:
            assert t["label"] in card, t["label"]


def test_page_counts_from_data(root):
    with open(os.path.join(root, "web", "app.js"), encoding="utf-8") as f:
        app = f.read()
    # the page states its numbers from data.js, not as literals
    assert "${BUNDLED.length} LLM tokenizers" in app
    assert "on 120 fixture texts" in app.lower()
    with open(os.path.join(root, "fixtures", "slices.json"), encoding="utf-8") as f:
        assert sum(s["rows"] for s in json.load(f)) == 120


def test_price_text(root):
    """The README, the method and the page state the price date of prices.json and show each
    promotional note; none of them calls the defaults standard rates."""
    p = load_prices()
    docs = {}
    for rel in ("README.md", "docs/METHOD.md", "CHANGELOG.md", "web/app.js"):
        with open(os.path.join(root, rel), encoding="utf-8") as f:
            docs[rel] = f.read()
    for rel in ("README.md", "docs/METHOD.md", "CHANGELOG.md"):
        assert p["price_date"] in docs[rel], rel
    for rel, text in docs.items():
        assert "standard rate" not in text.lower(), rel
    for row in p["prices"]:
        if row["price_note"]:
            assert row["price_note"] in docs["README.md"]
    assert "promo: (d) => `promotional price, at least through ${dateEn(d)}`" in docs["web/app.js"]
    assert "OpenAI rows follow the model-to-encoding table of tiktoken 0.14.0 (gpt-oss checked); other rows list" in docs["README.md"].replace("\n", " ")

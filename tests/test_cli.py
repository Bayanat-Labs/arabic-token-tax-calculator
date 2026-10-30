import json

from token_tax_calculator import cli, engines
from conftest import FakeEngine


def test_tokenizers_and_prices(capsys):
    assert cli.main(["tokenizers"]) == 0
    out = capsys.readouterr().out
    assert "o200k_base" in out and "Apache-2.0" in out
    assert cli.main(["prices", "--json"]) == 0
    assert json.loads(capsys.readouterr().out)["price_date"] == "2026-10-30"
    assert cli.main(["prices"]) == 0
    out = capsys.readouterr().out
    assert "promotional price, at least through 21 Nov 2026" in out and "standard rate" not in out.lower()


def test_count_json(monkeypatch, capsys):
    monkeypatch.setattr(engines, "load", lambda entry: FakeEngine(entry["id"], 2))
    assert cli.main(["count", "واحد اثنان ثلاثة", "--en", "one two", "--tokenizers", "o200k_base",
                     "--budget", "5", "--json"]) == 0
    r = json.loads(capsys.readouterr().out)
    row = r["tokenizers"][0]
    assert row["ar"]["tokens"] == 6 and row["en"]["tokens"] == 4 and row["ratio_ar_en"] == 1.5
    assert row["ar"]["fits_budget"] is False and row["ar"]["overflow_tokens"] == 1
    assert r["costs"] and r["costs"][0]["times"] == 1000


def test_count_table(monkeypatch, capsys):
    monkeypatch.setattr(engines, "load", lambda entry: FakeEngine(entry["id"], 2))
    assert cli.main(["count", "واحد اثنان", "--tokenizers", "o200k_base,qwen3.5", "--price-in", "1",
                     "--price-out", "2", "--price-tokenizer", "qwen3.5"]) == 0
    out = capsys.readouterr().out
    assert "Arabic text: 2 words" in out and "your price" in out
    assert "gpt-5.6-sol *" in out and "* gpt-5.6-sol: promotional price, at least through 21 Nov 2026" in out

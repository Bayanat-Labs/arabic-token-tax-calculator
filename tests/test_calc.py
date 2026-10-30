import pytest

from token_tax_calculator.calc import costs, load_prices, measure


def test_measure_with_parallel_and_budget(fake_engines):
    ar = "واحد اثنان ثلاثة"          # 3 words
    en = "one two three four"          # 4 words
    r = measure(ar, en, ["o200k_base", "qwen3.5"], budget=7, engines=fake_engines)
    a, b = r["tokenizers"]
    assert a["ar"]["tokens"] == 6 and a["en"]["tokens"] == 8
    assert a["ratio_ar_en"] == pytest.approx(0.75)
    assert a["ar"]["tokens_per_word"] == pytest.approx(2.0)
    assert a["ar"]["tokens_per_1000_words"] == pytest.approx(2000.0)
    assert a["ar"]["chars_per_token"] == pytest.approx(14 / 6)
    assert a["ar"]["fits_budget"] is True and a["ar"]["overflow_tokens"] == 0 and a["ar"]["kept_share"] == 1.0
    assert b["ar"]["tokens"] == 9 and b["ar"]["fits_budget"] is False
    assert b["ar"]["overflow_tokens"] == 2 and b["ar"]["kept_share"] == pytest.approx(7 / 9)
    assert r["text"]["ar"]["words"] == 3 and r["text"]["en"]["words"] == 4


def test_measure_without_parallel(fake_engines):
    r = measure("نص", None, ["o200k_base"], engines=fake_engines)
    row = r["tokenizers"][0]
    assert "en" not in row and "ratio_ar_en" not in row
    assert "fits_budget" not in row["ar"]


def test_unknown_tokenizer(fake_engines):
    with pytest.raises(KeyError):
        measure("نص", None, ["no-such"], engines=fake_engines)


def test_bad_budget(fake_engines):
    with pytest.raises(ValueError):
        measure("نص", None, ["o200k_base"], budget=0, engines=fake_engines)


def test_costs(fake_engines):
    r = measure("واحد اثنان", "one two", ["o200k_base"], engines=fake_engines)
    rows = costs(r, load_prices(), times=1000)
    sol = next(c for c in rows if c["model"] == "gpt-5.6-sol")
    # 4 tokens x $4.00 per 1M x 1,000 texts
    assert sol["send_ar_usd"] == pytest.approx(4 * 4.0 / 1e6 * 1000)
    assert sol["generate_ar_usd"] == pytest.approx(4 * 20.0 / 1e6 * 1000)
    assert sol["extra_send_usd"] == pytest.approx(0.0)
    assert all(c["tokenizer_id"] == "o200k_base" for c in rows)


def test_custom_price(fake_engines):
    r = measure("واحد اثنان", None, ["qwen3.5"], engines=fake_engines)
    rows = costs(r, load_prices(), times=1, custom=[{"model": "mine", "tokenizer_id": "qwen3.5",
                                                     "input_usd_per_mtok": 1.0, "output_usd_per_mtok": 2.0}])
    mine = next(c for c in rows if c["model"] == "mine")
    assert mine["send_ar_usd"] == pytest.approx(6 / 1e6)
    assert "send_en_usd" not in mine

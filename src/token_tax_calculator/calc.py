"""The calculator: per-tokenizer measures for an Arabic text and, optionally, its English parallel,
and costs at the dated list prices (or prices you give)."""
from __future__ import annotations

import json
import os
from typing import Iterable

from . import __version__
from .textstats import stats

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def load_registry(path: str | None = None) -> dict:
    with open(path or os.path.join(DATA, "registry.json"), encoding="utf-8") as f:
        return json.load(f)


def load_prices(path: str | None = None) -> dict:
    with open(path or os.path.join(DATA, "prices.json"), encoding="utf-8") as f:
        return json.load(f)


def _div(a: float, b: float) -> float | None:
    return a / b if b else None


def side_measures(tokens: int, st: dict, budget: int | None) -> dict:
    out = {
        "tokens": tokens,
        "tokens_per_word": _div(tokens, st["words"]),
        "tokens_per_1000_words": (1000 * tokens / st["words"]) if st["words"] else None,
        "chars_per_token": _div(st["chars"], tokens),
    }
    if budget is not None:
        out["fits_budget"] = tokens <= budget
        out["overflow_tokens"] = max(0, tokens - budget)
        out["kept_share"] = 1.0 if tokens <= budget else budget / tokens
    return out


def measure(text_ar: str, text_en: str | None = None, tokenizer_ids: Iterable[str] | None = None,
            budget: int | None = None, engines: dict | None = None, registry: dict | None = None) -> dict:
    """Measure `text_ar` (and `text_en`, its English parallel) with each tokenizer.

    `engines` maps tokenizer id to a loaded Engine; missing ones are loaded from the registry."""
    from .engines import load

    reg = registry or load_registry()
    entries = {t["id"]: t for t in reg["tokenizers"]}
    ids = list(tokenizer_ids) if tokenizer_ids else list(entries)
    unknown = [i for i in ids if i not in entries]
    if unknown:
        raise KeyError(f"unknown tokenizer id(s): {', '.join(unknown)}")
    if budget is not None and budget < 1:
        raise ValueError("budget must be a positive number of tokens")
    engines = dict(engines or {})
    st_ar = stats(text_ar)
    st_en = stats(text_en) if text_en is not None else None
    rows = []
    for tid in ids:
        e = entries[tid]
        eng = engines.get(tid) or load(e)
        engines[tid] = eng
        t_ar = eng.count(text_ar)
        row = {"id": tid, "label": e["label"], "revision": eng.revision, "library": eng.library,
               "ar": side_measures(t_ar, st_ar, budget)}
        if st_en is not None:
            t_en = eng.count(text_en)
            row["en"] = side_measures(t_en, st_en, budget)
            row["ratio_ar_en"] = _div(t_ar, t_en)
        rows.append(row)
    return {
        "tool": "arabic-token-tax-calculator", "version": __version__,
        "text": {"ar": st_ar, "en": st_en}, "budget": budget, "tokenizers": rows,
    }


def costs(result: dict, prices: dict | None = None, times: int = 1000, custom: list[dict] | None = None) -> list[dict]:
    """Cost of sending (input price) and of generating (output price) `times` texts like the
    measured one, for each price row whose tokenizer was measured. `custom` rows have the keys
    model, tokenizer_id, input_usd_per_mtok, output_usd_per_mtok."""
    prices = prices or load_prices()
    by_id = {r["id"]: r for r in result["tokenizers"]}
    rows = []
    for p in list(prices["prices"]) + list(custom or []):
        r = by_id.get(p["tokenizer_id"])
        if r is None:
            continue
        pin, pout = float(p["input_usd_per_mtok"]), float(p["output_usd_per_mtok"])
        row = {
            "model": p["model"], "vendor": p.get("vendor", "custom"), "tokenizer_id": p["tokenizer_id"],
            "input_usd_per_mtok": pin, "output_usd_per_mtok": pout,
            "checked_at": p.get("checked_at"), "source_url": p.get("source_url"), "price_note": p.get("price_note"),
            "times": times,
            "send_ar_usd": r["ar"]["tokens"] * pin / 1e6 * times,
            "generate_ar_usd": r["ar"]["tokens"] * pout / 1e6 * times,
        }
        if "en" in r:
            row["send_en_usd"] = r["en"]["tokens"] * pin / 1e6 * times
            row["generate_en_usd"] = r["en"]["tokens"] * pout / 1e6 * times
            row["extra_send_usd"] = row["send_ar_usd"] - row["send_en_usd"]
            row["extra_generate_usd"] = row["generate_ar_usd"] - row["generate_en_usd"]
        rows.append(row)
    return rows

"""token-tax: the command-line Arabic Token-Tax Calculator.

  token-tax count "النص العربي" [--en "English parallel"] [--tokenizers o200k_base,qwen3.5]
                  [--budget 8192] [--times 1000] [--json]
  token-tax count --file ar.txt --en-file en.txt
  token-tax tokenizers            the tokenizers, pinned revisions and licences
  token-tax prices                the dated list prices used for costs
  token-tax fixtures --fixtures fixtures/fixtures.jsonl --out counts.json
  token-tax check-fixtures --fixtures fixtures/fixtures.jsonl --expected fixtures/expected_counts.json
"""
from __future__ import annotations

import argparse
import json
import sys

from . import __version__
from .calc import costs, load_prices, load_registry, measure


def _fmt(x, nd=2, dash="-"):
    if x is None:
        return dash
    if isinstance(x, bool):
        return "yes" if x else "no"
    if isinstance(x, int):
        return f"{x:,}"
    return f"{x:,.{nd}f}"


def _table(headers: list[str], rows: list[list[str]], left: int = 1, right: set[int] | None = None) -> str:
    """Columns before `left` are left-aligned and the rest right-aligned, unless `right` names the
    right-aligned columns."""
    widths = [max(len(h), *(len(r[i]) for r in rows)) if rows else len(h) for i, h in enumerate(headers)]
    def line(cells):
        is_right = (lambda i: i in right) if right is not None else (lambda i: i >= left)
        return "  ".join(c.rjust(w) if is_right(i) else c.ljust(w) for i, (c, w) in enumerate(zip(cells, widths))).rstrip()
    return "\n".join([line(headers), line(["-" * w for w in widths])] + [line(r) for r in rows])


def _read(text: str | None, path: str | None) -> str | None:
    if path:
        with open(path, encoding="utf-8") as f:
            return f.read()
    return text


def cmd_count(a) -> int:
    text_ar = _read(a.text, a.file)
    if text_ar is None:
        print("give the Arabic text as an argument or with --file", file=sys.stderr)
        return 2
    text_en = _read(a.en, a.en_file)
    ids = [s.strip() for s in a.tokenizers.split(",")] if a.tokenizers else None
    res = measure(text_ar, text_en, ids, a.budget)
    custom = []
    if a.price_in is not None or a.price_out is not None:
        if not a.price_tokenizer:
            print("--price-in/--price-out need --price-tokenizer", file=sys.stderr)
            return 2
        custom.append({"model": a.price_label, "vendor": "custom", "tokenizer_id": a.price_tokenizer,
                       "input_usd_per_mtok": a.price_in or 0.0, "output_usd_per_mtok": a.price_out or 0.0})
    prices = load_prices()
    cost_rows = costs(res, prices, a.times, custom)
    if a.json:
        res["costs"] = cost_rows
        res["price_date"] = prices["price_date"]
        json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
        print()
        return 0
    t = res["text"]
    print(f"Arabic text: {t['ar']['words']:,} words, {t['ar']['chars']:,} characters (no spaces), {t['ar']['bytes']:,} UTF-8 bytes")
    if t["en"]:
        print(f"English parallel: {t['en']['words']:,} words, {t['en']['chars']:,} characters (no spaces)")
    if a.budget:
        print(f"Context budget: {a.budget:,} tokens")
    print()
    has_en = t["en"] is not None
    head = ["Tokenizer", "Tokens"] + (["Tokens EN", "AR/EN"] if has_en else []) + ["Tokens/word", "Per 1,000 words", "Chars/token"]
    if a.budget:
        head += ["Fits", "Over by", "Kept"]
    rows = []
    for r in res["tokenizers"]:
        ar = r["ar"]
        row = [r["label"], _fmt(ar["tokens"])]
        if has_en:
            row += [_fmt(r["en"]["tokens"]), _fmt(r["ratio_ar_en"])]
        row += [_fmt(ar["tokens_per_word"]), _fmt(ar["tokens_per_1000_words"], 0), _fmt(ar["chars_per_token"])]
        if a.budget:
            row += [_fmt(ar["fits_budget"]), _fmt(ar["overflow_tokens"]), f"{ar['kept_share'] * 100:.1f}%"]
        rows.append(row)
    print(_table(head, rows))
    if cost_rows:
        print()
        print(f"Cost of {a.times:,} texts like this one, USD, at list prices read on {prices['price_date']} (UTC) "
              "or the prices you gave:")
        head = ["Model", "Tokenizer", "In $/1M", "Out $/1M", "Send"] + (["Send EN", "Extra"] if has_en else []) + ["Generate"] + (["Generate EN", "Extra"] if has_en else [])
        rows = []
        labels = {r["id"]: r["label"] for r in res["tokenizers"]}
        for c in cost_rows:
            row = [c["model"] + (" *" if c.get("price_note") else ""), labels[c["tokenizer_id"]],
                   _fmt(c["input_usd_per_mtok"]), _fmt(c["output_usd_per_mtok"]),
                   _fmt(c["send_ar_usd"], 4)]
            if has_en:
                row += [_fmt(c["send_en_usd"], 4), _fmt(c["extra_send_usd"], 4)]
            row.append(_fmt(c["generate_ar_usd"], 4))
            if has_en:
                row += [_fmt(c["generate_en_usd"], 4), _fmt(c["extra_generate_usd"], 4)]
            rows.append(row)
        print(_table(head, rows, left=2))
        for c in cost_rows:
            if c.get("price_note"):
                print(f"* {c['model']}: {c['price_note']}")
        print("Prices change; sources: " + ", ".join(sorted({c['source_url'] for c in cost_rows if c['source_url']})))
    return 0


def cmd_tokenizers(a) -> int:
    reg = load_registry()
    if a.json:
        json.dump(reg, sys.stdout, ensure_ascii=False, indent=1)
        print()
        return 0
    rows = []
    for t in reg["tokenizers"]:
        rev = t.get("revision", "")[:7] or t.get("encoding", "")
        src = t.get("repo_id") or f"tiktoken:{t['encoding']}"
        rows.append([t["id"], t["label"], src, rev, t["licence"], "yes" if t["bundled"] else "no"])
    print(_table(["Id", "Tokenizer", "Source", "Revision", "Licence", "In browser page"], rows, left=6))
    return 0


def cmd_prices(a) -> int:
    p = load_prices()
    if a.json:
        json.dump(p, sys.stdout, ensure_ascii=False, indent=1)
        print()
        return 0
    rows = [[r["vendor"], r["model"], r["tokenizer_id"], _fmt(r["input_usd_per_mtok"]), _fmt(r["output_usd_per_mtok"]),
             r["checked_at"][:10], r.get("price_note") or "-", r["source_url"]] for r in p["prices"]]
    print(_table(["Vendor", "Model", "Tokenizer", "In $/1M", "Out $/1M", "Checked", "Note", "Source"], rows, right={3, 4}))
    print("Prices read from the vendors' official price pages; no batch, cache or off-peak discounts.")
    return 0


def _fixtures(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def fixture_texts(fixtures: list[dict]) -> tuple[list[str], list[str]]:
    """The texts counted for the fixture check: each Arabic text, each English parallel, and the
    Arabic and English texts joined with newlines (a longer, multi-line input)."""
    texts = [r["text_ar"] for r in fixtures] + [r["text_en"] for r in fixtures]
    keys = [f"{r['row_id']}:ar" for r in fixtures] + [f"{r['row_id']}:en" for r in fixtures]
    texts += ["\n".join(r["text_ar"] for r in fixtures), "\n".join(r["text_en"] for r in fixtures)]
    keys += ["all:ar", "all:en"]
    return texts, keys


def fixture_counts(fixtures: list[dict], ids: list[str] | None = None, with_ids: bool = False) -> dict:
    from .engines import load

    reg = load_registry()
    entries = [t for t in reg["tokenizers"] if not ids or t["id"] in ids]
    out = {"tool_version": __version__, "fixtures": len(fixtures), "tokenizers": {}}
    texts, keys = fixture_texts(fixtures)
    for e in entries:
        eng = load(e)
        enc = eng.encode(texts)
        d = {"revision": eng.revision, "library": eng.library, "counts": {k: len(v) for k, v in zip(keys, enc)}}
        if with_ids:
            d["ids"] = {k: v for k, v in zip(keys, enc)}
        out["tokenizers"][e["id"]] = d
    return out


def cmd_fixtures(a) -> int:
    ids = [s.strip() for s in a.tokenizers.split(",")] if a.tokenizers else None
    out = fixture_counts(_fixtures(a.fixtures), ids, a.ids)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=None if a.ids else 1, sort_keys=False)
        f.write("\n")
    n_texts = len(next(iter(out['tokenizers'].values()))['counts']) if out['tokenizers'] else 0
    print(f"{len(out['tokenizers'])} tokenizers x {n_texts} texts written to {a.out}")
    return 0


def cmd_check_fixtures(a) -> int:
    with open(a.expected, encoding="utf-8") as f:
        exp = json.load(f)
    ids = [s.strip() for s in a.tokenizers.split(",")] if a.tokenizers else list(exp["tokenizers"])
    got = fixture_counts(_fixtures(a.fixtures), ids)
    bad = 0
    for tid in ids:
        e, g = exp["tokenizers"][tid]["counts"], got["tokenizers"][tid]["counts"]
        diff = [k for k in e if e[k] != g.get(k)]
        bad += len(diff)
        print(f"{tid}: {len(e) - len(diff)}/{len(e)} counts match" + (f"; differ: {', '.join(diff[:5])}" if diff else ""))
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="token-tax", description="Arabic Token-Tax Calculator by Bayanat Labs.")
    ap.add_argument("--version", action="version", version=f"token-tax {__version__}")
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("count", help="measure an Arabic text, optionally with its English parallel")
    c.add_argument("text", nargs="?", help="the Arabic text")
    c.add_argument("--file", help="read the Arabic text from a UTF-8 file")
    c.add_argument("--en", help="the English parallel")
    c.add_argument("--en-file", help="read the English parallel from a UTF-8 file")
    c.add_argument("--tokenizers", help="comma-separated tokenizer ids (default: all; see `token-tax tokenizers`)")
    c.add_argument("--budget", type=int, help="context budget in tokens")
    c.add_argument("--times", type=int, default=1000, help="number of texts for the cost table (default 1000)")
    c.add_argument("--price-in", type=float, help="your input price, USD per 1M tokens")
    c.add_argument("--price-out", type=float, help="your output price, USD per 1M tokens")
    c.add_argument("--price-tokenizer", help="tokenizer id your price applies to")
    c.add_argument("--price-label", default="your price", help="label for your price row")
    c.add_argument("--json", action="store_true", help="print JSON")
    c.set_defaults(fn=cmd_count)

    t = sub.add_parser("tokenizers", help="list the tokenizers")
    t.add_argument("--json", action="store_true")
    t.set_defaults(fn=cmd_tokenizers)

    p = sub.add_parser("prices", help="list the dated list prices")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_prices)

    f = sub.add_parser("fixtures", help="count the fixture texts with each tokenizer")
    f.add_argument("--fixtures", default="fixtures/fixtures.jsonl")
    f.add_argument("--out", required=True)
    f.add_argument("--tokenizers")
    f.add_argument("--ids", action="store_true", help="also write the token ids")
    f.set_defaults(fn=cmd_fixtures)

    k = sub.add_parser("check-fixtures", help="compare fixture counts with the frozen expected counts")
    k.add_argument("--fixtures", default="fixtures/fixtures.jsonl")
    k.add_argument("--expected", default="fixtures/expected_counts.json")
    k.add_argument("--tokenizers")
    k.set_defaults(fn=cmd_check_fixtures)

    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    raise SystemExit(main())

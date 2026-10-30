"""Check the built browser page with Playwright (Chromium), offline.

  python scripts/check_space.py --space dist/space --report space_check.json [--shots shots/]

Serves the page on 127.0.0.1, blocks every request to any other host (and records it), and checks:
  1. parity: for each tokenizer in the page, the token ids for the fixture texts equal
     fixtures/expected_ids.json (the Python reference tool), plus the token count of a long text
     (about 100,000 characters) equals the Python count;
  2. the page's own numbers for the first example equal the Python calculator's;
  3. privacy: no request leaves the page's origin, and nothing is written to localStorage,
     sessionStorage, IndexedDB or cookies, also while a 5 MiB text is measured;
  4. layout: no horizontal scroll at 1280 and 375 px, in English and Arabic; screenshots.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import os
import socketserver
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "src"))


# Edge cases compared with the Python tool directly: special-token strings, repeated, leading and
# trailing white space, tabs and CRLF, emoji, both digit sets, tatweel, presentation forms, ZWNJ.
EDGE = ["<|endoftext|> نص <|fim_prefix|>", "<s> </s> <unk> <bos> <eos> [INST]", "  مسافات  مزدوجة  ",
        "\tسطر\nجديد\r\nآخر", "😀 رموز ✓ ★", "١٢٣٤٥٦٧٨٩٠ 1234567890 ۱۲۳", "كتـــــاب", "ﻻ ﷲ ﷺ",
        "a\u200cb\u200dc\u200f", " ", "x"]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(directory: str):
    handler = functools.partial(Quiet, directory=directory)
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"


def long_text(fixtures: list[dict], n: int = 100_000) -> str:
    base = "\n".join(r["text_ar"] for r in fixtures)
    t = base
    while len(t) < n:
        t += "\n" + base
    return t[:n]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--space", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--shots")
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright

    from token_tax_calculator.calc import measure
    from token_tax_calculator.cli import fixture_texts

    with open(os.path.join(ROOT, "fixtures", "fixtures.jsonl"), encoding="utf-8") as f:
        fixtures = [json.loads(line) for line in f if line.strip()]
    with open(os.path.join(ROOT, "fixtures", "expected_ids.json"), encoding="utf-8") as f:
        expected = json.load(f)
    texts, keys = fixture_texts(fixtures)
    longt = long_text(fixtures)

    httpd, base = serve(a.space)
    report = {"url": base, "parity": {}, "long_text_chars": len(longt), "outside_requests": [], "console_errors": [],
              "storage": {}, "layout": {}, "numbers": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")

        def route(r):
            if r.request.url.startswith(base):
                return r.continue_()
            report["outside_requests"].append(r.request.url)
            return r.abort()

        ctx.route("**/*", route)
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and report["console_errors"].append(m.text))
        page.on("pageerror", lambda e: report["console_errors"].append(str(e)))
        page.goto(base + "/index.html")
        page.wait_for_function("window.tokenTax !== undefined")

        # 1. parity
        bundled = page.evaluate("import('./data.js').then(m => m.TOKENIZERS.filter(t => t.asset).map(t => t.id))")
        from token_tax_calculator.calc import load_registry
        from token_tax_calculator.engines import load
        reg = {t["id"]: t for t in load_registry()["tokenizers"]}
        for tid in bundled:
            edge_ids = page.evaluate("([tok, texts]) => window.tokenTax.encode(tok, texts)", [tid, EDGE])
            py_edge = load(reg[tid]).encode(EDGE)
            edge_same = sum(1 for a_, b_ in zip(edge_ids, py_edge) if a_ == b_)
            report.setdefault("edge_cases", {})[tid] = {"texts": len(EDGE), "identical_ids": edge_same, "ok": edge_same == len(EDGE)}
            ids = page.evaluate("([tok, texts]) => window.tokenTax.encode(tok, texts)", [tid, texts + [longt]])
            exp = expected["tokenizers"][tid]["ids"]
            same = sum(1 for k, got in zip(keys, ids) if got == exp[k])
            py_long = load(reg[tid]).count(longt)
            report["parity"][tid] = {"texts": len(keys), "identical_ids": same, "long_text_tokens_browser": len(ids[-1]),
                                     "long_text_tokens_python": py_long, "ok": same == len(keys) and len(ids[-1]) == py_long}
            print(f"{tid}: {same}/{len(keys)} identical; long text {len(ids[-1])} vs {py_long}; edge cases {edge_same}/{len(EDGE)}")

        # 1b. words, characters and bytes: the page's textStats against the Python textstats
        from token_tax_calculator.textstats import stats as py_stats
        js = page.evaluate("(texts) => texts.map(t => window.tokenTax.textStats(t))", texts + [longt])
        same = sum(1 for t_, j in zip(texts + [longt], js)
                   if (lambda p_: (p_["words"], p_["chars"], p_["bytes"]) == (j["words"], j["chars"], j["bytes"]))(py_stats(t_)))
        report["text_stats"] = {"texts": len(js), "identical": same, "ok": same == len(js)}
        print(f"text statistics: {same}/{len(js)} identical")

        # 2. the page's numbers for the first example (default selection) against the Python tool
        page.select_option("#examples", "0")
        page.wait_for_timeout(400)
        page.wait_for_function("() => { const r = window.tokenTax.results(); return Object.keys(r).length >= 5; }", timeout=60000)
        results = page.evaluate("window.tokenTax.results()")
        ex = page.evaluate("import('./data.js').then(m => m.EXAMPLES[0])")
        report["numbers_example"] = ex["row_id"]
        py = measure(ex["ar"], ex["en"], list(results), 8192)
        for row in py["tokenizers"]:
            r = results[row["id"]]
            report["numbers"][row["id"]] = {"browser_ar": r["ar"]["tokens"], "python_ar": row["ar"]["tokens"],
                                            "browser_en": r["en"]["tokens"], "python_en": row["en"]["tokens"]}
        table = page.inner_text("#table")
        report["numbers"]["table_text"] = table

        # 3. privacy: a 5 MiB text, then storage
        unit = "نص عربي للاختبار "
        big = unit * (5 * 1024 * 1024 // len(unit.encode("utf-8")) + 1)
        page.evaluate("(t) => { const a = document.getElementById('text-ar'); a.value = t; a.dispatchEvent(new Event('input')); }", big)
        page.wait_for_function("() => { const r = window.tokenTax.results(); return Object.keys(r).length >= 5; }", timeout=180000)
        report["storage"] = page.evaluate("""async () => ({
            localStorage: localStorage.length, sessionStorage: sessionStorage.length, cookies: document.cookie.length,
            indexedDB: (indexedDB.databases ? (await indexedDB.databases()).length : null) })""")
        report["big_text_bytes"] = len(big.encode("utf-8"))

        # 4. layout and screenshots
        for width, height in ((1280, 900), (375, 812)):
            for lang in ("en", "ar"):
                pg = ctx.new_page()
                pg.set_viewport_size({"width": width, "height": height})
                pg.goto(base + "/index.html" + ("?lang=ar" if lang == "ar" else ""))
                pg.wait_for_function("() => Object.keys(window.tokenTax.results()).length >= 5", timeout=60000)
                pg.wait_for_timeout(300)
                sw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
                report["layout"][f"{width}-{lang}"] = {"scrollWidth": sw[0], "clientWidth": sw[1], "ok": sw[0] <= sw[1]}
                if a.shots:
                    os.makedirs(a.shots, exist_ok=True)
                    pg.screenshot(path=os.path.join(a.shots, f"{width}-{lang}-top.png"))
                    pg.screenshot(path=os.path.join(a.shots, f"{width}-{lang}-full.png"), full_page=True)
                    if width == 1280 and lang == "en":
                        pg.click("#card-draw")
                        pg.wait_for_selector("#card-img:not([hidden])")
                        pg.wait_for_timeout(300)
                        data = pg.evaluate("document.getElementById('card').toDataURL('image/png')")
                        import base64
                        with open(os.path.join(a.shots, "share-card-en.png"), "wb") as f:
                            f.write(base64.b64decode(data.split(",", 1)[1]))
                    if width == 1280 and lang == "ar":
                        pg.click("#card-draw")
                        pg.wait_for_selector("#card-img:not([hidden])")
                        pg.wait_for_timeout(300)
                        data = pg.evaluate("document.getElementById('card').toDataURL('image/png')")
                        import base64
                        with open(os.path.join(a.shots, "share-card-ar.png"), "wb") as f:
                            f.write(base64.b64decode(data.split(",", 1)[1]))
                pg.close()
        browser.close()
    httpd.shutdown()

    ok = (all(v["ok"] for v in report["parity"].values()) and not report["outside_requests"]
          and all(v["ok"] for v in report["edge_cases"].values())
          and not report["console_errors"] and all(v == 0 for v in report["storage"].values() if v is not None)
          and all(v["ok"] for v in report["layout"].values())
          and all(v["browser_ar"] == v["python_ar"] and v["browser_en"] == v["python_en"]
                  for k, v in report["numbers"].items() if k != "table_text")
          and len(report["numbers"]) > 1 and report["text_stats"]["ok"])
    report["ok"] = ok
    with open(a.report, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("OK" if ok else "FAILED", "- report:", a.report)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

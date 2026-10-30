"""Build the static browser page (the Hugging Face Space) from web/ and the pinned tokenizer files.

  python scripts/build_space.py --out dist/space

Needs: this package installed (`pip install -e .`), `pip install "transformers==5.20.2" protobuf`
for the ALLaM conversion, and `npm ci` in web/ (js-tiktoken ranks). Steps:

1. For each tokenizer marked `bundled` in the registry, download its tokenizer files at the pinned
   revision (checked against the registry SHA-256) or, for the OpenAI encodings, read the ranks
   shipped with js-tiktoken. ALLaM's SentencePiece tokenizer.model is converted to a tokenizer.json
   that reproduces SentencePiece encoding (dummy prefix on the whole text, the user-defined digit
   pieces split out, BPE with byte fallback).
2. Check, with the Python `tokenizers` library, that each shipped tokenizer.json gives the same
   token ids as the reference engine on all fixture texts.
3. Write each tokenizer as assets/tok/<id>.b64 (minified JSON, gzip, base64: a text file under
   10 MB, so the Space serves it from its own origin) and record its SHA-256 in data.js.
4. Copy the page, write data.js, MANIFEST.json and SHA256SUMS.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "src"))

from token_tax_calculator import __version__  # noqa: E402
from token_tax_calculator.calc import load_prices, load_registry  # noqa: E402
from token_tax_calculator.cli import fixture_texts  # noqa: E402
from token_tax_calculator.engines import USER_AGENT, _download, load  # noqa: E402

RELEASED = "2026-10-30"
PAGE_FILES = ["index.html", "app.js", "worker.js", "style.css", "vendor/tokenizers.min.mjs",
              "vendor/js-tiktoken-lite.mjs", "fonts/IBMPlexSansArabic-Regular.woff2",
              "fonts/IBMPlexSansArabic-SemiBold.woff2", "fonts/OFL.txt"]
MAX_ASSET_BYTES = 9_500_000


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def hf_json(repo_id: str, filename: str, revision: str) -> dict:
    from huggingface_hub import hf_hub_download

    p = hf_hub_download(repo_id=repo_id, filename=filename, revision=revision, user_agent=USER_AGENT)
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def allam_tokenizer_json(entry: dict) -> dict:
    """tokenizer.json reproducing SentencePiece encoding of the ALLaM tokenizer.model."""
    import tempfile

    from transformers import AutoTokenizer

    model = _download(entry["repo_id"], entry["file"], entry["revision"], entry["file_sha256"])
    cfg = hf_json(entry["repo_id"], "tokenizer_config.json", entry["revision"])
    tmp = tempfile.mkdtemp()
    shutil.copy(model, os.path.join(tmp, "tokenizer.model"))
    with open(os.path.join(tmp, "tokenizer_config.json"), "w", encoding="utf-8") as f:
        json.dump(cfg, f)
    tok = AutoTokenizer.from_pretrained(tmp, legacy=False, from_slow=True)
    j = json.loads(tok.backend_tokenizer.to_str())
    user_defined = [a["content"] for a in j["added_tokens"] if not a["special"]]
    assert all(len(c) == 1 and c.isdigit() for c in user_defined), user_defined
    j["normalizer"] = {"type": "Sequence", "normalizers": [
        {"type": "Prepend", "prepend": "▁"},
        {"type": "Replace", "pattern": {"String": " "}, "content": "▁"}]}
    j["pre_tokenizer"] = {"type": "Split", "pattern": {"Regex": "[" + "".join(user_defined) + "]"},
                          "behavior": "Isolated", "invert": False}
    j["added_tokens"] = []
    shutil.rmtree(tmp, ignore_errors=True)
    return j


def tiktoken_ranks(web: str, encoding: str) -> dict:
    p = os.path.join(web, "node_modules", "js-tiktoken", "dist", "ranks", f"{encoding}.js")
    with open(p, encoding="utf-8") as f:
        src = f.read().strip()
    prefix = "export default "
    assert src.startswith(prefix), p
    return json.loads(src[len(prefix):].rstrip(";"))


def check_json_parity(entry: dict, tok_json: dict, texts: list[str]) -> int:
    from tokenizers import Tokenizer

    ref = load(entry).encode(texts)
    shipped = Tokenizer.from_str(json.dumps(tok_json, ensure_ascii=False))
    got = [e.ids for e in shipped.encode_batch(texts, add_special_tokens=False)]
    bad = sum(1 for a, b in zip(ref, got) if a != b)
    return bad


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--web", default=os.path.join(ROOT, "web"))
    a = ap.parse_args()
    out, web = a.out, a.web
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, "assets", "tok"))

    reg, prices = load_registry(), load_prices()
    with open(os.path.join(ROOT, "fixtures", "fixtures.jsonl"), encoding="utf-8") as f:
        fixtures = [json.loads(line) for line in f if line.strip()]
    with open(os.path.join(ROOT, "fixtures", "slices.json"), encoding="utf-8") as f:
        slices = json.load(f)
    texts, _keys = fixture_texts(fixtures)

    page_tokenizers = []
    for e in reg["tokenizers"]:
        item = {k: e[k] for k in ("id", "label", "vendor", "route", "models", "licence", "licence_url",
                                   "bundled", "browser_note", "vocab_size", "licence_checked_on",
                                   "index_reference")}
        if e["route"] == "tiktoken":
            item["source"] = f"tiktoken {e['encoding']}"
            item["source_url"] = "https://github.com/openai/tiktoken"
            item["revision_short"] = e["encoding"]
        else:
            item["source"] = f"{e['repo_id']}@{e['revision'][:7]}"
            item["source_url"] = f"https://huggingface.co/{e['repo_id']}/tree/{e['revision']}"
            item["revision_short"] = e["revision"][:7]
        item["asset"] = None
        if e["bundled"]:
            if e["route"] == "tiktoken":
                obj = tiktoken_ranks(web, e["encoding"])
            else:
                if e["route"] == "sentencepiece":
                    tok_json = allam_tokenizer_json(e)
                    cfg = {}
                else:
                    tok_json = hf_json(e["repo_id"], "tokenizer.json", e["revision"])
                    cfg = hf_json(e["repo_id"], "tokenizer_config.json", e["revision"])
                    cfg = {k: v for k, v in cfg.items() if k not in ("chat_template", "added_tokens_decoder")}
                bad = check_json_parity(e, tok_json, texts)
                print(f"{e['id']}: shipped tokenizer.json vs reference engine, {len(texts) - bad}/{len(texts)} identical")
                if bad:
                    raise SystemExit(f"{e['id']}: the shipped tokenizer.json differs from the reference engine")
                obj = {"tokenizer": tok_json, "config": cfg}
            raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            b64 = base64.b64encode(gzip.compress(raw, 9, mtime=0)) + b"\n"
            if len(b64) > MAX_ASSET_BYTES:
                raise SystemExit(f"{e['id']}: asset is {len(b64)} bytes")
            rel = f"assets/tok/{e['id']}.b64"
            with open(os.path.join(out, rel), "wb") as f:
                f.write(b64)
            item["asset"] = {"path": rel, "sha256": sha256_bytes(b64), "bytes": len(b64), "json_bytes": len(raw)}
            print(f"{e['id']}: {rel} {len(b64):,} bytes")
        page_tokenizers.append(item)

    # One example per slice: the fixture whose o200k_base Arabic/English token ratio is the median
    # of its slice (the lower of the two middle rows), so the examples are typical, not extreme.
    with open(os.path.join(ROOT, "fixtures", "expected_counts.json"), encoding="utf-8") as f:
        counts = json.load(f)["tokenizers"]["o200k_base"]["counts"]

    def ratio(r):
        return counts[f"{r['row_id']}:ar"] / counts[f"{r['row_id']}:en"]

    examples = []
    for s in slices:
        rows = sorted((r for r in fixtures if r["slice"] == s["slice"]), key=lambda r: (ratio(r), r["row_id"]))
        row = rows[(len(rows) - 1) // 2]
        examples.append({"slice": s["slice"], "label_en": s["label_en"], "label_ar": s["label_ar"],
                         "illustrative": s["illustrative"], "row_id": row["row_id"], "ar": row["text_ar"], "en": row["text_en"]})

    for rel in PAGE_FILES:
        dst = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(os.path.join(web, rel), dst)
    shutil.copy(os.path.join(web, "README.space.md"), os.path.join(out, "README.md"))
    for name in ("LICENSE", "LICENSE-data", "NOTICE"):
        shutil.copy(os.path.join(ROOT, name), os.path.join(out, name))
    shutil.copytree(os.path.join(ROOT, "LICENSES"), os.path.join(out, "LICENSES"))

    libs = {}
    for name, pkg in (("tokenizers.js", "@huggingface/tokenizers"), ("js-tiktoken", "js-tiktoken")):
        with open(os.path.join(web, "node_modules", *pkg.split("/"), "package.json"), encoding="utf-8") as f:
            libs[name] = json.load(f)["version"]
    data = {
        "VERSION": __version__, "RELEASED": RELEASED, "LIBS": libs,
        "TOKENIZERS": page_tokenizers,
        "PRICES": {"price_date": prices["price_date"], "notes": prices["notes"], "prices": prices["prices"], "no_price": prices["no_price"]},
        "EXAMPLES": examples,
    }
    js = ["// Generated by scripts/build_space.py from the registry, price table and fixtures. Do not edit."]
    for k, v in data.items():
        js.append(f"export const {k} = {json.dumps(v, ensure_ascii=False, indent=1)};")
    with open(os.path.join(out, "data.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(js) + "\n")

    files = []
    for dirpath, _dirs, names in os.walk(out):
        for n in sorted(names):
            p = os.path.join(dirpath, n)
            rel = os.path.relpath(p, out).replace(os.sep, "/")
            if rel in ("SHA256SUMS", "MANIFEST.json"):
                continue
            with open(p, "rb") as f:
                b = f.read()
            files.append({"path": rel, "bytes": len(b), "sha256": sha256_bytes(b)})
    files.sort(key=lambda x: x["path"])
    manifest = {"name": "Arabic Token-Tax Calculator", "version": __version__, "released": RELEASED,
                "publisher": "Bayanat Labs", "files": files}
    with open(os.path.join(out, "MANIFEST.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=1)
        f.write("\n")
    with open(os.path.join(out, "SHA256SUMS"), "w", encoding="utf-8", newline="\n") as f:
        for x in files:
            f.write(f"{x['sha256']}  {x['path']}\n")
    print(f"{len(files)} files written to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

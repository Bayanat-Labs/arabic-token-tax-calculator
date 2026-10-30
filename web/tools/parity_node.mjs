// Parity check in Node: the tokenizer files of the built page, run with the same libraries as the
// page, must give the token ids in fixtures/expected_ids.json (computed with the Python tool).
// Run from web/: npm ci && node tools/parity_node.mjs ../dist/space
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Tokenizer } from "@huggingface/tokenizers";
import { Tiktoken } from "js-tiktoken/lite";

const space = process.argv[2];
if (!space) { console.error("usage: node tools/parity_node.mjs <built page directory>"); process.exit(2); }
const root = path.resolve(process.cwd(), "..");
const exp = JSON.parse(fs.readFileSync(path.join(root, "fixtures/expected_ids.json"), "utf8"));
const fixtures = fs.readFileSync(path.join(root, "fixtures/fixtures.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const texts = {};
for (const r of fixtures) texts[`${r.row_id}:ar`] = r.text_ar;
for (const r of fixtures) texts[`${r.row_id}:en`] = r.text_en;
texts["all:ar"] = fixtures.map((r) => r.text_ar).join("\n");
texts["all:en"] = fixtures.map((r) => r.text_en).join("\n");

const { TOKENIZERS } = await import(path.resolve(space, "data.js"));
let failed = 0;
for (const t of TOKENIZERS.filter((x) => x.asset)) {
  const b64 = fs.readFileSync(path.join(space, t.asset.path), "utf8");
  const obj = JSON.parse(zlib.gunzipSync(Buffer.from(b64.trim(), "base64")).toString("utf8"));
  const encode = t.route === "tiktoken"
    ? ((enc) => (s) => enc.encode(s, [], []))(new Tiktoken(obj))
    : ((tok) => (s) => tok.encode(s, { add_special_tokens: false }).ids)(new Tokenizer(obj.tokenizer, obj.config));
  const ref = exp.tokenizers[t.id].ids;
  const bad = Object.entries(texts).filter(([k, s]) => JSON.stringify(encode(s)) !== JSON.stringify(ref[k])).map(([k]) => k);
  failed += bad.length;
  console.log(`${t.id}: ${Object.keys(texts).length - bad.length}/${Object.keys(texts).length} identical` + (bad.length ? ` (differ: ${bad.slice(0, 5).join(", ")})` : ""));
}
process.exit(failed ? 1 : 0);

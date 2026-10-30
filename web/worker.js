// Arabic Token-Tax Calculator by Bayanat Labs: the tokenizer worker.
// Tokenizer files are loaded from this page's own assets/tok/ folder (gzip, base64), checked against
// the SHA-256 in data.js, and run with tokenizers.js (Hugging Face tokenizer.json files) or
// js-tiktoken (OpenAI encodings). Text never leaves the browser.
import { Tokenizer } from "./vendor/tokenizers.min.mjs";
import { Tiktoken } from "./vendor/js-tiktoken-lite.mjs";
import { TOKENIZERS } from "./data.js";

const META = Object.fromEntries(TOKENIZERS.filter((t) => t.asset).map((t) => [t.id, t]));
const cache = new Map(); // id -> Promise<{encode, decode}>
let latestJob = 0;

async function sha256Hex(text) {
  if (!self.crypto || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function gunzipBase64(b64) {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function loadTokenizer(id) {
  const m = META[id];
  if (!m) throw new Error(`unknown tokenizer ${id}`);
  const res = await fetch(m.asset.path, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${m.asset.path}: HTTP ${res.status}`);
  const b64 = await res.text();
  const digest = await sha256Hex(b64);
  if (digest && digest !== m.asset.sha256) throw new Error(`${m.asset.path}: SHA-256 differs from data.js`);
  const obj = JSON.parse(await gunzipBase64(b64));
  if (m.route === "tiktoken") {
    const enc = new Tiktoken(obj);
    // No special tokens allowed or disallowed: text such as "<|endoftext|>" is encoded as ordinary
    // text, as tiktoken's encode_ordinary does.
    return { encode: (t) => enc.encode(t, [], []), decode: (ids) => enc.decode(ids) };
  }
  const tok = new Tokenizer(obj.tokenizer, obj.config);
  return {
    encode: (t) => tok.encode(t, { add_special_tokens: false }).ids,
    decode: (ids) => tok.decode(ids, { skip_special_tokens: false, clean_up_tokenization_spaces: false }),
  };
}

function get(id) {
  if (!cache.has(id)) {
    const t0 = performance.now();
    const p = loadTokenizer(id).then((tk) => {
      postMessage({ type: "status", tok: id, state: "ready", ms: Math.round(performance.now() - t0) });
      return tk;
    });
    p.catch((e) => {
      cache.delete(id);
      postMessage({ type: "status", tok: id, state: "error", error: String(e && e.message || e) });
    });
    cache.set(id, p);
    postMessage({ type: "status", tok: id, state: "loading" });
  }
  return cache.get(id);
}

// Split the first `max` tokens into displayable pieces. A token that ends inside a character is
// shown together with the following token(s) until the character is complete.
function pieces(tk, ids, max) {
  const out = [];
  const n = Math.min(ids.length, max);
  let start = 0;
  for (let k = 0; k < n; k++) {
    const s = tk.decode(ids.slice(start, k + 1));
    if (s.includes("�") && k + 1 - start < 8 && k + 1 < n) continue;
    out.push({ text: s, n: k + 1 - start });
    start = k + 1;
  }
  return out;
}

function keptChars(tk, ids, budget) {
  if (!budget || ids.length <= budget) return null;
  try {
    return tk.decode(ids.slice(0, budget)).replace(/�+$/u, "").length;
  } catch (e) {
    return null;
  }
}

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === "measure") {
    latestJob = m.job;
    for (const id of m.tokenizers) {
      if (m.job !== latestJob) return;
      let tk;
      try {
        tk = await get(id);
      } catch (e) {
        continue;
      }
      if (m.job !== latestJob) return;
      const t0 = performance.now();
      const ar = tk.encode(m.ar);
      const r = { type: "result", job: m.job, tok: id, ar: { tokens: ar.length, kept_chars: keptChars(tk, ar, m.budget) } };
      if (m.en !== null && m.en !== undefined) r.en = { tokens: tk.encode(m.en).length };
      if (m.view === id) r.view = pieces(tk, ar, m.viewMax || 400);
      r.ms = Math.round(performance.now() - t0);
      postMessage(r);
    }
    postMessage({ type: "done", job: m.job });
  } else if (m.type === "ids") {
    try {
      const tk = await get(m.tok);
      postMessage({ type: "ids", req: m.req, ids: m.texts.map((t) => tk.encode(t)) });
    } catch (e) {
      postMessage({ type: "ids", req: m.req, error: String(e && e.message || e) });
    }
  } else if (m.type === "preload") {
    for (const id of m.tokenizers) get(id).catch(() => {});
  }
};

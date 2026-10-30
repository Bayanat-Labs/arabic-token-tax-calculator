// Bundle the two browser tokenizer libraries into web/vendor/ as self-contained ES modules.
// Run from web/: npm ci && npm run vendor
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const web = process.cwd();
const out = path.join(web, "vendor");
fs.mkdirSync(out, { recursive: true });
const tk = JSON.parse(fs.readFileSync(path.join(web, "node_modules/js-tiktoken/package.json"), "utf8"));
const hf = JSON.parse(fs.readFileSync(path.join(web, "node_modules/@huggingface/tokenizers/package.json"), "utf8"));

await build({
  stdin: { contents: 'export { Tiktoken } from "js-tiktoken/lite";', resolveDir: web, loader: "js" },
  bundle: true, format: "esm", minify: true, legalComments: "inline", target: "es2020",
  outfile: path.join(out, "js-tiktoken-lite.mjs"),
  banner: { js: `/*! js-tiktoken ${tk.version} (lite), MIT licence, https://github.com/dqbd/tiktoken; includes base64-js, MIT licence. Bundled by esbuild. */` },
});
const src = fs.readFileSync(path.join(web, "node_modules/@huggingface/tokenizers/dist/tokenizers.min.mjs"), "utf8");
fs.writeFileSync(path.join(out, "tokenizers.min.mjs"),
  `/*! @huggingface/tokenizers ${hf.version} (tokenizers.js), Apache-2.0 licence, https://github.com/huggingface/tokenizers.js */\n` + src);
console.log(`vendor: js-tiktoken ${tk.version}, @huggingface/tokenizers ${hf.version}`);

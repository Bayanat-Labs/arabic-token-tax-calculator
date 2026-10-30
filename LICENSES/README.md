# Third-party licences

The browser page (the Hugging Face Space built by `scripts/build_space.py`) ships the tokenizer
files and libraries below. Each keeps its own licence. The Python package ships no tokenizer files:
it downloads them from their publishers at the pinned revisions in
`src/token_tax_calculator/data/registry.json` and checks their SHA-256.

## Tokenizer files in the browser page

Licences were read from each model repository at the pinned revision on 2026-10-19. The page
includes the tokenizers whose licence is MIT or Apache-2.0.

| Tokenizer | File in the page | Source and revision | Licence | Licence text |
|---|---|---|---|---|
| OpenAI o200k_base | `assets/tok/o200k_base.b64` | ranks distributed with js-tiktoken 1.0.21 | MIT | `tiktoken-MIT.txt` |
| OpenAI cl100k_base | `assets/tok/cl100k_base.b64` | ranks distributed with js-tiktoken 1.0.21 | MIT | `tiktoken-MIT.txt` |
| Qwen3 | `assets/tok/qwen3.b64` | Qwen/Qwen3-235B-A22B @ 8efa617, tokenizer.json | Apache-2.0 | `Qwen3-LICENSE.txt` |
| Qwen3.5 / 3.6 / 3.8 | `assets/tok/qwen3.5.b64` | Qwen/Qwen3.5-397B-A17B @ 8472618, tokenizer.json | Apache-2.0 | `Qwen3.5-LICENSE.txt` |
| DeepSeek V3 / V4 | `assets/tok/deepseek.b64` | deepseek-ai/DeepSeek-V4-Pro-0813 @ 72e1d32, tokenizer.json | MIT | `DeepSeek-MIT.txt` |
| Mistral Tekken | `assets/tok/mistral-tekken.b64` | mistralai/Mistral-Small-4-119B-2603 @ a11f36b, tokenizer.json | Apache-2.0 | `../LICENSE` (Apache-2.0 text) |
| Gemma 4 / Fanar-2 | `assets/tok/gemma4.b64` | google/gemma-4-31B-it @ 842da37, tokenizer.json | Apache-2.0 | `../LICENSE` (Apache-2.0 text) |
| ALLaM | `assets/tok/allam.b64` | humain-ai/ALLaM-7B-Instruct-preview @ a28dd1e, tokenizer.model | Apache-2.0 | `../LICENSE` (Apache-2.0 text) |
| Fanar-1 | `assets/tok/fanar-1.b64` | QCRI/Fanar-1-9B-Instruct @ d30938d, tokenizer.json | Apache-2.0 | `../LICENSE` (Apache-2.0 text) |

Changes made to these files: each `.b64` file holds the tokenizer JSON re-serialised without white
space, compressed with gzip and encoded in base64, together with the tokenizer configuration
(`tokenizer_config.json` without its chat template). The ALLaM file is a conversion of the
SentencePiece `tokenizer.model` into the Hugging Face `tokenizer.json` format (transformers 5.20.2
converter, then the dummy prefix, white-space escaping and digit pieces arranged to reproduce
SentencePiece encoding). For the OpenAI encodings the file holds the js-tiktoken rank tables. On the
fixtures each file gives the same token ids as the original file run with the Python reference
libraries.

Falcon3, Falcon-H1 and Falcon-H1R (TII Falcon licence, `falcon-llm-license` on the model cards) run
in the command-line tool, which downloads their tokenizer files from the model repositories at run
time. The page shows their Arabic Token-Tax Index measurements.

## Libraries in the browser page

| Library | File | Licence | Licence text |
|---|---|---|---|
| tokenizers.js (`@huggingface/tokenizers` 0.2.0) | `vendor/tokenizers.min.mjs` | Apache-2.0 | `tokenizers.js-Apache-2.0.txt` |
| js-tiktoken 1.0.21 (lite build) | `vendor/js-tiktoken-lite.mjs` | MIT | `tiktoken-MIT.txt` (the same text is in github.com/dqbd/tiktoken) |
| base64-js 1.5.1 (inside the js-tiktoken build) | `vendor/js-tiktoken-lite.mjs` | MIT | `base64-js-MIT.txt` |
| IBM Plex Sans Arabic 1.005 | `fonts/*.woff2` | SIL OFL 1.1 | `fonts/OFL.txt` in the page (`web/fonts/OFL.txt` in the repository) |

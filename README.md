# Arabic Token-Tax Calculator

How many tokens does your Arabic text take, and how many more than the same text in English? The
Arabic Token-Tax Calculator counts the tokens of an Arabic text, and optionally its English parallel,
with LLM tokenizers and reports the token count, tokens per word, tokens per 1,000 words, the
Arabic/English token ratio, characters per token, whether the text fits a context budget, and the
cost of sending or generating it at dated list prices. It comes as a browser page that runs
entirely in your browser and as a Python command-line tool, `token-tax`, that gives the same token
ids. By **Bayanat Labs**.

**[Calculator on Hugging Face](https://huggingface.co/spaces/Bayanat-Labs/arabic-token-tax-calculator)** · [Method](docs/METHOD.md) · [Arabic Token-Tax Index](https://github.com/Bayanat-Labs/arabic-token-tax-index) · Version 0.1.0, 2026-10-30

## Install

```bash
pip install "git+https://github.com/Bayanat-Labs/arabic-token-tax-calculator@v0.1.0"
```

Python 3.10 or later. Tokenizer files are downloaded from their model repositories on first use
(tokenizer files at pinned revisions, checked by SHA-256; no model weights, no model code).

## Use

```bash
token-tax count "قالت البلدية إن أعمال صيانة الطريق الساحلي ستستمر ثلاثة أسابيع" \
  --en "The municipality said that maintenance work on the coastal road will continue for three weeks"
token-tax count --file ar.txt --en-file en.txt --tokenizers o200k_base,qwen3.5 --budget 8192
token-tax count --file ar.txt --price-in 0.8 --price-out 3.2 --price-tokenizer deepseek   # your own price
token-tax count --file ar.txt --json        # all measures and costs as JSON
token-tax tokenizers                        # tokenizers, revisions, licences
token-tax prices                            # the dated list prices
```

From Python:

```python
from token_tax_calculator import measure, costs

result = measure("نص عربي", "Arabic text", ["o200k_base", "qwen3.5"], budget=8192)
for row in result["tokenizers"]:
    print(row["label"], row["ar"]["tokens"], row["en"]["tokens"], row["ratio_ar_en"])
print(costs(result, times=1000))
```

## What it reports

For each tokenizer: tokens; tokens per word and per 1,000 words; characters per token; with an
English parallel, the Arabic/English token ratio (Arabic tokens ÷ English tokens); with a context
budget, whether the text fits, by how many tokens it is over and the share that fits; and the cost of
sending (input price) and generating (output price) a number of texts like it, at list prices or
yours. Words are runs of letters, marks and digits, and Arabic clitics are not split, so tokens per
word overstates the gap between the languages; the Arabic/English ratio compares the same content.
The full rules are in [docs/METHOD.md](docs/METHOD.md).

## Tokenizers

The 12 tokenizers, pinned revisions and model lists of the
[Arabic Token-Tax Index](https://github.com/Bayanat-Labs/arabic-token-tax-index) 0.1.0.
The command-line tool runs all 12; the browser page includes the 9 whose licence is MIT or
Apache-2.0 and shows the index measurement for the others. Licences were read from the model
repositories on 2026-10-19.

| Id | Tokenizer | Models with the same counts | Source and revision | Licence | In the browser page |
|---|---|---|---|---|---|
| `o200k_base` | OpenAI o200k_base | gpt-5 family (gpt-5*), gpt-4.5, gpt-4.1, gpt-4o, o1, o3, o4-mini, gpt-oss-120b, gpt-oss-20b | tiktoken `o200k_base` | [MIT](https://github.com/openai/tiktoken/blob/main/LICENSE) | yes |
| `cl100k_base` | OpenAI cl100k_base | gpt-4, gpt-3.5-turbo | tiktoken `cl100k_base` | [MIT](https://github.com/openai/tiktoken/blob/main/LICENSE) | yes |
| `qwen3` | Qwen3 | Qwen3-235B-A22B, Qwen3-8B, Qwen3-Next-80B-A3B-Instruct | [Qwen/Qwen3-235B-A22B](https://huggingface.co/Qwen/Qwen3-235B-A22B/tree/8efa61729e24bd65b1d152b5ab5409052aa80e65) @ `8efa617` | [Apache-2.0](https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/8efa61729e24bd65b1d152b5ab5409052aa80e65/LICENSE) | yes |
| `qwen3.5` | Qwen3.5 / 3.6 / 3.8 | Qwen3.5-397B-A17B, Qwen3.5-27B, Qwen3.6-27B, Qwen3.6-35B-A3B, Qwen3.8-27B, Qwen3.8-2.4T-A95B, Qwen3.8-Flash-Next | [Qwen/Qwen3.5-397B-A17B](https://huggingface.co/Qwen/Qwen3.5-397B-A17B/tree/8472618112abcbd45acbcdc58436aff4233c23f7) @ `8472618` | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.5-397B-A17B/blob/8472618112abcbd45acbcdc58436aff4233c23f7/LICENSE) | yes |
| `deepseek` | DeepSeek V3 / V4 | DeepSeek-V4-Pro-0813, DeepSeek-V4.1-Flash, DeepSeek-V4-Pro, DeepSeek-V4-Flash, DeepSeek-V3.2, DeepSeek-V3.1, DeepSeek-V3 | [deepseek-ai/DeepSeek-V4-Pro-0813](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/tree/72e1d3230f6c080a530b0a1d46f8eb4602340597) @ `72e1d32` | [MIT](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/72e1d3230f6c080a530b0a1d46f8eb4602340597/LICENSE) | yes |
| `mistral-tekken` | Mistral Tekken | Mistral-Small-4-119B-2603, Mistral-Medium-3.5-128B, Mistral-Large-3-675B-Instruct-2512, Ministral-3-8B-Instruct-2512, Mistral-Nemo-Instruct-2407 | [mistralai/Mistral-Small-4-119B-2603](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/tree/a11f36bebf709121056b1dbcc943d1c6afbe494d) @ `a11f36b` | [Apache-2.0](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/blob/a11f36bebf709121056b1dbcc943d1c6afbe494d/README.md) | yes |
| `gemma4` | Gemma 4 / Fanar-2 | gemma-4-31B-it, gemma-4-26B-A4B-it, gemma-4-E4B-it, Fanar-2-27B-Instruct | [google/gemma-4-31B-it](https://huggingface.co/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475) @ `842da37` | [Apache-2.0](https://ai.google.dev/gemma/docs/gemma_4_license) | yes |
| `falcon3` | Falcon3 | Falcon3-7B-Instruct | [tiiuae/Falcon3-7B-Instruct](https://huggingface.co/tiiuae/Falcon3-7B-Instruct/tree/1e57a0ecd176c7c139f289c60a74e57f887c3dfb) @ `1e57a0e` | [TII Falcon licence (falcon-llm-license)](https://falconllm.tii.ae/falcon-terms-and-conditions.html) | no |
| `falcon-h1` | Falcon-H1 | Falcon-H1-34B-Instruct | [tiiuae/Falcon-H1-34B-Instruct](https://huggingface.co/tiiuae/Falcon-H1-34B-Instruct/tree/6e6890e26cba1f58b1e6ee70d654ddf054f9fce8) @ `6e6890e` | [TII Falcon licence (falcon-llm-license)](https://falconllm.tii.ae/falcon-terms-and-conditions.html) | no |
| `falcon-h1r` | Falcon-H1R | Falcon-H1R-7B | [tiiuae/Falcon-H1R-7B](https://huggingface.co/tiiuae/Falcon-H1R-7B/tree/a6f74bf181389908efd6970878d7ee2b42f5d417) @ `a6f74bf` | [TII Falcon licence (falcon-llm-license)](https://falconllm.tii.ae/falcon-terms-and-conditions.html) | no |
| `allam` | ALLaM | ALLaM-7B-Instruct-preview | [humain-ai/ALLaM-7B-Instruct-preview](https://huggingface.co/humain-ai/ALLaM-7B-Instruct-preview/tree/a28dd1e67420cde72d3629c8633a974cf7d9c366) @ `a28dd1e` | [Apache-2.0](https://huggingface.co/humain-ai/ALLaM-7B-Instruct-preview/blob/a28dd1e67420cde72d3629c8633a974cf7d9c366/README.md) | yes |
| `fanar-1` | Fanar-1 | Fanar-1-9B-Instruct | [QCRI/Fanar-1-9B-Instruct](https://huggingface.co/QCRI/Fanar-1-9B-Instruct/tree/d30938d0efb1fd251727ee96df6987802ff84662) @ `d30938d` | [Apache-2.0](https://huggingface.co/QCRI/Fanar-1-9B-Instruct/blob/d30938d0efb1fd251727ee96df6987802ff84662/README.md) | yes |

OpenAI rows follow the model-to-encoding table of tiktoken 0.14.0 (gpt-oss checked); other rows list
models whose published tokenizer files gave the same counts on the index text. A tokenizer's count
is the count for the text alone: API requests add tokens for message formatting.

## The browser page

The page is static: a Web Worker runs the tokenizers with tokenizers.js
(`@huggingface/tokenizers` 0.2.0) and js-tiktoken 1.0.21, from tokenizer files served by the page
itself and checked by SHA-256. Its Content-Security-Policy allows network connections to its own
origin only; nothing you paste is sent anywhere or stored. It has an English and an Arabic
interface, a token view, a bar chart, an editable price table and a share card (a 1200×630 PNG
drawn in the page). The interface's Arabic text has not yet been reviewed by a native Arabic writer;
the English governs.

Build and check it:

```bash
pip install -e ".[test]" "transformers==5.20.2" protobuf "playwright==1.64.0"
npm ci --prefix web
python scripts/build_space.py --out dist/space
(cd web && node tools/parity_node.mjs ../dist/space)
python -m playwright install chromium
python scripts/check_space.py --space dist/space --report dist/space_check.json --shots dist/shots
```

## Parity

`fixtures/` holds 120 texts in 12 slices, each with an English parallel, and the token ids
the Python tool gives for them with each of the 12 tokenizers. For each of its 9
tokenizers, the browser page gives the same token ids on the 242 checked texts (the
120 Arabic texts, the 120 English texts and each set joined into one text), on
11 edge-case strings and on a text of 100,000 characters; its word, character and byte
counts equal the Python counts. The check also measures a 5.0 MiB text and records no request
outside the page's origin and no storage writes. Results of version 0.1.0 (`docs/parity-v0.1.0.json`):

| Tokenizer | Identical ids, fixture texts | Identical ids, edge cases | Long text, page / Python tokens |
|---|---|---|---|
| OpenAI o200k_base | 242/242 | 11/11 | 36,019 / 36,019 |
| OpenAI cl100k_base | 242/242 | 11/11 | 70,643 / 70,643 |
| Qwen3 | 242/242 | 11/11 | 44,010 / 44,010 |
| Qwen3.5 / 3.6 / 3.8 | 242/242 | 11/11 | 35,663 / 35,663 |
| DeepSeek V3 / V4 | 242/242 | 11/11 | 41,205 / 41,205 |
| Mistral Tekken | 242/242 | 11/11 | 34,600 / 34,600 |
| Gemma 4 / Fanar-2 | 242/242 | 11/11 | 37,715 / 37,715 |
| ALLaM | 242/242 | 11/11 | 29,264 / 29,264 |
| Fanar-1 | 242/242 | 11/11 | 40,382 / 40,382 |

The fixtures were written for this tool; names, organisations and amounts are fictional, and the
dialect rows are illustrative. The Arabic text has not yet been reviewed by a native Arabic writer;
the English governs. The fixtures test that the two implementations agree; they are not a corpus for
comparing tokenizers. For Arabic/English ratios on a large parallel corpus, see the index.

## Prices

The price table has 7 prices from 3 vendors, in US dollars per million tokens, without
batch, cache or off-peak discounts. The model rows come from the Arabic Token-Tax Index
0.1.0; the prices were read from the vendors' official price pages on 2026-10-30 (UTC).
Each row records its source URL, the SHA-256 of the page as served, the tokenizer it applies to and
why. The `gpt-5.6-sol` row is a promotional price, at least through 21 Nov 2026.

| Model | Vendor | Tokenizer | Input $/1M | Output $/1M | Note | Read on | Source |
|---|---|---|---:|---:|---|---|---|
| `gpt-5.6-sol` | OpenAI | OpenAI o200k_base | 4.00 | 20.00 | promotional price, at least through 21 Nov 2026 | 2026-10-30 | [page](https://developers.openai.com/api/docs/pricing) |
| `gpt-5.3-codex` | OpenAI | OpenAI o200k_base | 1.75 | 14.00 |  | 2026-10-30 | [page](https://developers.openai.com/api/docs/pricing) |
| `deepseek-v4-pro` | DeepSeek | DeepSeek V3 / V4 | 1.32 | 3.96 |  | 2026-10-30 | [page](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek-flash` | DeepSeek | DeepSeek V3 / V4 | 0.30 | 1.20 |  | 2026-10-30 | [page](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qwen3.5-397b-a17b` | Alibaba Cloud | Qwen3.5 / 3.6 / 3.8 | 0.60 | 3.60 |  | 2026-10-30 | [page](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| `qwen3.8-27b` | Alibaba Cloud | Qwen3.5 / 3.6 / 3.8 | 0.50 | 3.00 |  | 2026-10-30 | [page](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| `qwen3.8-2.4t-a95b` | Alibaba Cloud | Qwen3.5 / 3.6 / 3.8 | 2.00 | 6.00 |  | 2026-10-30 | [page](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |

Prices change: check the source before relying on a cost, or give your own with `--price-in` and
`--price-out` (or edit the price in the page).

## Files

| Path | Contents |
|---|---|
| `src/token_tax_calculator/` | the Python package and `token-tax` command |
| `src/token_tax_calculator/data/registry.json` | tokenizers: route, pinned revision, file SHA-256, models, licence, browser decision, index measurement |
| `src/token_tax_calculator/data/prices.json` | the dated price table |
| `fixtures/` | fixture texts, slices, expected counts and token ids, SHA256SUMS |
| `web/` | the browser page (HTML, CSS, JavaScript, bundled libraries, font) |
| `scripts/build_space.py`, `scripts/check_space.py` | build the page with its tokenizer files; check it in Chromium |
| `docs/METHOD.md` | the method |
| `LICENSES/` | licences of the tokenizer files and libraries in the page |

## Licence

Code: Apache-2.0 (`LICENSE`). Fixtures, tokenizer registry, price table and documentation: CC BY
4.0 (`LICENSE-data`). Tokenizer files and libraries in the browser page keep their own licences
(`LICENSES/README.md`). Font: IBM Plex Sans Arabic, SIL OFL 1.1. See `NOTICE`.

## Cite

```
Bayanat Labs (2026). Arabic Token-Tax Calculator, version 0.1.0.
https://github.com/Bayanat-Labs/arabic-token-tax-calculator
```

Questions and corrections: hello@bayanatlabs.com. Need production-grade, rights-cleared Arabic data
or a tokenizer-aware evaluation? Write to the same address.

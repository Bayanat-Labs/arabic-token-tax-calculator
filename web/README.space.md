---
title: Arabic Token-Tax Calculator
emoji: 🧮
colorFrom: indigo
colorTo: gray
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
short_description: Arabic token counts, Arabic/English ratio and cost
tags:
  - arabic
  - tokenizer
  - token-counter
  - llm
  - arabic-nlp
---

# Arabic Token-Tax Calculator

By **Bayanat Labs**. Paste Arabic text, and its English translation if you have one, and see for nine LLM tokenizers: the token count, tokens per word, tokens per 1,000 words, the Arabic/English token ratio, characters per token, whether the text fits a context budget, and the cost of sending or generating it at dated list prices that you can edit. A share card turns the result into a PNG.

The tokenizers run in your browser, in a Web Worker on this page. The page loads nothing but its own files: its Content-Security-Policy allows network connections to its own origin only, the tokenizer files are served from `assets/tok/` and checked by SHA-256, and nothing you paste is sent anywhere or stored. The interface is in English by default; switch to Arabic with the button at the top or `?lang=ar`.

On 120 fixture texts with English parallels, and on all of them joined into one text, the page gives the same token ids as the Python reference tool for each of its nine tokenizers: OpenAI o200k_base, OpenAI cl100k_base, Qwen3, Qwen3.5 / 3.6 / 3.8, DeepSeek V3 / V4, Mistral Tekken, Gemma 4 / Fanar-2, ALLaM and Fanar-1. Falcon3, Falcon-H1 and Falcon-H1R run in the command-line tool; the page shows their Arabic Token-Tax Index measurements.

- Command-line tool, method and fixtures: [github.com/Bayanat-Labs/arabic-token-tax-calculator](https://github.com/Bayanat-Labs/arabic-token-tax-calculator)
- Arabic Token-Tax Index (Arabic/English ratios on UN parallel text): [huggingface.co/spaces/Bayanat-Labs/arabic-token-tax-index](https://huggingface.co/spaces/Bayanat-Labs/arabic-token-tax-index)

Code: Apache-2.0 (`LICENSE`). Fixtures, price table and page text: CC BY 4.0 (`LICENSE-data`). Tokenizer files and libraries keep their own licences, MIT or Apache-2.0 (`LICENSES/README.md`). Font: IBM Plex Sans Arabic, SIL OFL 1.1 (`fonts/OFL.txt`). The Arabic text has not yet been reviewed by a native Arabic writer; the English governs. Contact: hello@bayanatlabs.com.

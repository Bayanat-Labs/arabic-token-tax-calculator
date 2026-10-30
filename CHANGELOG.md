# Changelog

## 0.1.0 (2026-10-30)

- Browser calculator (static page, Web Worker, no network access beyond its own files) and the
  `token-tax` command-line tool with the same measures: token count, tokens per word, tokens per
  1,000 words, Arabic/English token ratio, characters per token, context-budget fit, cost of sending
  and generating at list prices.
- Tokenizers, pinned revisions and price rows from the Arabic Token-Tax Index 0.1.0: 12 tokenizers
  in the command-line tool, 9 of them (MIT or Apache-2.0) in the browser page. The 7 prices were read
  again from the vendors' price pages on 2026-10-30; a promotional price carries a note.
- 120 fixture texts in 12 slices with English parallels, frozen token counts and token ids.
- Parity: the browser page gives the same token ids as the Python tool on the fixtures for its 9
  tokenizers.
- Share card: a 1200×630 PNG drawn in the page.

# Method

How the Arabic Token-Tax Calculator counts, version 0.1.0. The browser page and the Python
command-line tool follow the same rules; the parity checks below show that they give the same token
ids.

## Input

Text is measured as written. Neither the page nor the command-line tool normalises, cleans or
trims the text before tokenizing, so the counts are those of the exact string you paste. A
tokenizer may normalise internally (for example NFC in the Qwen tokenizers); that is part of the
tokenizer.

## Tokens

Each text (the Arabic text and, if given, its English parallel) is encoded on its own, with no
special tokens:

| Route | Python reference | Browser page |
|---|---|---|
| OpenAI encodings (o200k_base, cl100k_base) | tiktoken 0.14.0, `encode_ordinary` | js-tiktoken 1.0.21, `encode(text, [], [])`: special-token strings such as `<\|endoftext\|>` count as ordinary text, as in `encode_ordinary` |
| Hugging Face `tokenizer.json` | tokenizers, `encode(add_special_tokens=False)` | tokenizers.js (`@huggingface/tokenizers` 0.2.0), `encode(add_special_tokens: false)` |
| SentencePiece `tokenizer.model` (ALLaM) | sentencepiece 0.2.x, `encode` (no BOS or EOS) | tokenizers.js with a converted `tokenizer.json` (below) |

The token count is the number of ids. BOS, EOS and chat-template tokens are not counted, and neither
are the tokens an API adds for message formatting.

## Words, characters and bytes

- **Words** follow `wordcount-v1` of the Arabic Token-Tax Index: maximal runs of letters (Unicode
  category L), marks (M) and decimal digits (Nd). An apostrophe (`'` or U+2019) or a hyphen between
  two word characters stays inside the word, and so does a comma, full stop, U+066B or U+066C between
  two digits. Everything else separates words. Arabic clitics are not split: `وسيكتبونها` is one
  word.
- **Characters** are Unicode code points that are not white space. White space is the list of code
  points for which Python's `str.isspace()` is true (29 code points, Unicode 15.0); the page uses
  the same list.
- **Bytes** are UTF-8 bytes.

## Measures

For each tokenizer and each side (Arabic, English):

| Measure | Formula |
|---|---|
| tokens per word | tokens ÷ words |
| tokens per 1,000 words | 1,000 × tokens ÷ words |
| characters per token | characters ÷ tokens |
| Arabic/English ratio | Arabic tokens ÷ English tokens, same tokenizer |
| fits the context budget | tokens ≤ budget |
| over by | max(0, tokens − budget) |
| share that fits | 1 if it fits, otherwise budget ÷ tokens |
| cost of sending N texts | tokens × input price per 1M tokens ÷ 1,000,000 × N |
| cost of generating N texts | tokens × output price per 1M tokens ÷ 1,000,000 × N |
| Arabic extra | Arabic cost − English cost |

Because Arabic clitics stay attached, an Arabic text has fewer and longer words than its English
parallel. Tokens per word therefore overstates the difference between the languages; the
Arabic/English ratio compares the same content and is the measure to lead with.

The page also reports how many characters of the Arabic text the first `budget` tokens cover (the
text decoded from those tokens, without a trailing partial character). This is a display aid and is
not part of the command-line output.

## Prices

The default prices use the model rows of the price table of the Arabic Token-Tax Index 0.1.0: list
prices in US dollars per million tokens, without batch, cache or off-peak discounts, read from the
vendors' official price pages on 2026-10-30 (UTC), each with its source URL and the SHA-256 of the
page as served. A price that the vendor page marks as promotional carries a note (`price_note`) in
`prices.json`, in the page's cost table and in the output of `token-tax prices` and `token-tax count`. A price applies to the tokenizer the index maps the model to, with the mapping basis
recorded for each row. In the page every price can be edited and new rows added; the edits stay in
the page and are not stored.

## Tokenizer files

The registry (`src/token_tax_calculator/data/registry.json`) takes the 12 tokenizers of the Arabic
Token-Tax Index 0.1.0 with their pinned revisions, file SHA-256 and model lists. The command-line
tool downloads each tokenizer file from its model repository at the pinned revision and refuses a
file whose SHA-256 differs.

The browser page includes the tokenizers whose licence, read from the model repository at the pinned
revision, is MIT or Apache-2.0. `scripts/build_space.py` writes each one as `assets/tok/<id>.b64`:
the tokenizer JSON (with `tokenizer_config.json` minus its chat template) re-serialised without
white space, compressed with gzip and encoded in base64. Each file is a text file under 10 MB, so the
Space serves it from its own origin. Before writing a file the build checks, with the Python
`tokenizers` library, that the shipped JSON gives the same ids as the reference engine on all
fixture texts. The page loads a file the first time its tokenizer is selected and checks its SHA-256
against `data.js`.

ALLaM publishes a SentencePiece model. The build converts it with the transformers 5.20.2
slow-to-fast converter and then arranges the result to reproduce SentencePiece encoding: the
`▁` dummy prefix and the white-space escaping are applied to the whole text by the normaliser, the
20 user-defined digit pieces (0–9 and ٠–٩) are split out by the pre-tokenizer, and BPE runs with
byte fallback. On the fixtures, and on test strings with leading, trailing and repeated spaces,
tabs, newlines, digits, emoji and `<s>`, it gives the same ids as SentencePiece.

## Parity

`fixtures/fixtures.jsonl` holds 120 texts in 12 slices, each with an English parallel. The checked
texts are the 120 Arabic texts, the 120 English texts and the two texts formed by joining each set
with newlines (242 texts). `fixtures/expected_ids.json` holds the token ids from the Python tool for
the 12 tokenizers; `fixtures/expected_counts.json` the counts.

- `python -m pytest` checks the fixtures, the frozen files and their SHA-256 sums; with
  `TOKEN_TAX_NETWORK=1` it downloads the tokenizer files and re-counts the fixtures.
- `node web/tools/parity_node.mjs dist/space` runs the built page's tokenizer files with the page's
  libraries in Node and compares the ids.
- `python scripts/check_space.py` opens the built page in Chromium with Playwright, offline, and
  compares the page's ids for the 242 texts, for 11 edge-case strings (special-token strings,
  repeated and trailing white space, tabs and CRLF, emoji, three digit sets, tatweel, presentation
  forms, zero-width characters) and its count for a text of about 100,000 characters with the
  Python tool, and the page's word, character and byte counts with the Python counts. It
  also measures a 5 MiB text and checks that no request leaves the page's origin and that nothing is
  written to localStorage, sessionStorage, IndexedDB or cookies, and that the page has no horizontal
  scroll at 1280 and 375 pixels in English and Arabic.

## Fixtures

The fixtures were written for this tool by Bayanat Labs. Names, organisations, order numbers and
amounts are fictional. Slices: Standard Arabic in four registers (general, formal and legal style,
business and customer service, technical), Gulf, Egyptian, Levantine and Maghrebi Arabic (illustrative
dialect text), Arabic in Latin script (Arabizi), Arabic–English code-switching, numbers, dates and
punctuation (both digit sets, Hijri and Gregorian dates), and fully diacritised Standard Arabic. Each
slice has 10 rows. The Arabic text has not yet been reviewed by a native Arabic writer; the English
governs. The fixtures test that the browser and Python counts agree; they are not a corpus for
comparing tokenizers.

The page offers one example per slice: the fixture whose o200k_base Arabic/English ratio is the
median of its slice (the lower of the two middle rows).

## Share card

The page draws a 1200×630 PNG on a canvas: the headline ratio (or tokens per word when there is no
English parallel), the headline tokenizer, a bar for each selected tokenizer, the tokenizer ids with
their short revisions, the date and the page address. The text you measured is left out unless you
tick the box, which adds its first 80 characters. Nothing is uploaded; the PNG is a local download.

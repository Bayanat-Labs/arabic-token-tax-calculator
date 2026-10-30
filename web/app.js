// Arabic Token-Tax Calculator by Bayanat Labs. Static page: the tokenizers run in a Web Worker in
// this page (worker.js) from the page's own files. Text you paste is not sent anywhere and is not
// stored. The numbers follow the same rules as the Python command-line tool `token-tax`.
import { VERSION, RELEASED, LIBS, TOKENIZERS, PRICES, EXAMPLES } from "./data.js";

const $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "text") e.textContent = v;
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid !== undefined && kid !== null) e.append(kid);
  return e;
}

// ---------------------------------------------------------------- words, characters, bytes
// Words: wordcount-v1 of the Arabic Token-Tax Index (runs of letters, marks and digits; an
// apostrophe or hyphen between word characters and , . U+066B U+066C between digits stay inside).
// Characters: code points that are not white space (the list of Python's str.isspace()).
const WS = new Set([0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000].map((c) => String.fromCodePoint(c)));
const WORD_CH = /^[\p{L}\p{M}\p{Nd}]$/u;
const DIGIT = /^\p{Nd}$/u;
const JOIN_ANY = new Set(["'", "’", "-"]);
const JOIN_DIGITS = new Set([",", ".", "٫", "٬"]);

export function textStats(text) {
  const cps = Array.from(text);
  let words = 0, inWord = false, last = "", chars = 0;
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i];
    if (!WS.has(ch)) chars++;
    if (WORD_CH.test(ch)) { inWord = true; last = ch; continue; }
    if (inWord && i + 1 < cps.length) {
      const nxt = cps[i + 1];
      if (JOIN_ANY.has(ch) && WORD_CH.test(nxt)) { last = ch; continue; }
      if (JOIN_DIGITS.has(ch) && DIGIT.test(last) && DIGIT.test(nxt)) { last = ch; continue; }
    }
    if (inWord) { words++; inWord = false; }
  }
  if (inWord) words++;
  return { words, chars, bytes: new TextEncoder().encode(text).length, codepoints: cps.length };
}

// The measures for one side (Arabic or English) of one tokenizer, as in the Python tool.
export function sideMeasures(tokens, st, budget) {
  const out = {
    tokens,
    tokens_per_word: st.words ? tokens / st.words : null,
    tokens_per_1000_words: st.words ? (1000 * tokens) / st.words : null,
    chars_per_token: tokens ? st.chars / tokens : null,
  };
  if (budget) {
    out.fits_budget = tokens <= budget;
    out.overflow_tokens = Math.max(0, tokens - budget);
    out.kept_share = tokens <= budget ? 1 : budget / tokens;
  }
  return out;
}

// ---------------------------------------------------------------- strings
const BUNDLED = TOKENIZERS.filter((t) => t.asset);
const sizesMB = BUNDLED.map((t) => t.asset.bytes / 1e6);
const MIN_MB = Math.min(...sizesMB).toFixed(1), MAX_MB = Math.max(...sizesMB).toFixed(1);
const IDX = TOKENIZERS[0].index_reference;
const PRICE_DATE = PRICES.price_date;
const LIC_CHECKED = TOKENIZERS[0].licence_checked_on;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const ymd = (d) => d.split("-").map(Number);
const dateEn = (d) => { const [y, m, day] = ymd(d); return `${day} ${MONTHS_EN[m - 1]} ${y}`; };
const dateAr = (d) => { const [y, m, day] = ymd(d); return `${day} ${MONTHS_AR[m - 1]} ${y}`; };

const T = {
  en: {
    skip: "Skip to the results", brand: "Bayanat Labs", title: "Arabic Token-Tax Calculator",
    lede: `Paste Arabic text, and its English translation if you have one. See how many tokens it takes with ${BUNDLED.length} LLM tokenizers, how many more than the English, how much of it fits in a context window, and what it costs at list prices.`,
    privacy: "Your text stays in your browser: the tokenizers run in this page, the page loads nothing but its own files, and nothing is stored.",
    inputH: "Your text", examples: "Examples", pick: "Load an example…", arLabel: "Arabic text",
    enLabel: "English parallel (optional)", budget: "Context budget, tokens", times: "Texts, for the cost",
    toksH: "Tokenizers", selAll: "Select all", clear: "Clear text",
    loadNote: `Each tokenizer's file loads the first time you select it (${MIN_MB} to ${MAX_MB} MB).`,
    resultsH: "Results", tableH: "Per tokenizer", viewH: "Token view", viewTok: "Tokenizer",
    viewNote: "The first 400 tokens. Each coloured chip is one token; a chip marked ×2 or more holds tokens that share a character. A red bar marks the end of the context budget.",
    costH: "Cost at list prices", addPrice: "Add your own price", resetPrices: "Reset prices",
    shareH: "Share card", shareNote: "A 1200×630 PNG drawn in this page with the headline numbers, the tokenizer revisions and the date. Your text is left out unless you tick the box.",
    includeText: "Include the first 80 characters of my Arabic text", cardDraw: "Draw the card", cardDl: "Download PNG",
    refH: "Index measurements on UN text", howH: "How it is computed", tokListH: "Tokenizers and licences", citeH: "Cite as",
    ctaText: "Need production-grade, rights-cleared Arabic data or a tokenizer-aware evaluation? Write to hello@bayanatlabs.com.",
    codeLink: "Code on GitHub", indexLink: "Arabic Token-Tax Index",
    licence: "Code: Apache-2.0. Fixtures, price table and page text: CC BY 4.0. Tokenizer files keep their own licences (MIT or Apache-2.0; see LICENSES/). Font: IBM Plex Sans Arabic, SIL OFL 1.1.",
    toggle: "العربية",
    hint: "Paste or type Arabic text to see the results.",
    headSel: "Headline tokenizer",
    ratioSub: (label, r, a, b) => `On ${label}, the Arabic text takes ${r} times as many tokens as its English parallel (${a} against ${b}).`,
    noEnBig: (n) => `${n} tokens`,
    noEnSub: (label, tpw, cpt) => `On ${label}: ${tpw} tokens per word and ${cpt} characters per token. Add the English parallel to see the Arabic/English ratio.`,
    stats: (s, e) => `Arabic: ${s.words} words, ${s.chars} characters, ${s.bytes} bytes` + (e ? ` · English: ${e.words} words, ${e.chars} characters` : ""),
    tooBig: "The text is larger than 10 MiB; shorten it to measure it here, or use the command-line tool.",
    cols: ["Tokenizer", "Tokens", "Tokens, English", "Arabic/English", "Tokens per word", "Per 1,000 words", "Characters per token", "Context budget"],
    fits: "fits", over: (n, p) => `over by ${n} · ${p}% fits`,
    loading: "loading…", waiting: "waiting", failed: "failed to load", ready: (ms) => `ready`,
    budgetNote: (b, label, kept, total) => `With a budget of ${b} tokens, ${label} keeps the first ${kept} of the ${total} characters of the Arabic text.`,
    chartRatio: "Arabic/English token ratio (the line marks 1: the same number of tokens)",
    chartTpw: "Tokens per word, Arabic text",
    costNote: (n) => `Cost of sending (input price) and of generating (output price) ${n} texts like this one, in US dollars. Default prices are list prices read from the vendors' pages on ${PRICE_DATE} (UTC), without batch, cache or off-peak discounts; a note under the model name marks a promotional price. Edit a price to use your own; your edits stay in this page.`,
    costCols: ["Model", "Tokenizer", "Input $/1M", "Output $/1M", "Send", "Send, English", "Arabic extra", "Generate", "Generate, English", "Arabic extra", "Price source"],
    promo: (d) => `promotional price, at least through ${dateEn(d)}`,
    vendorPage: "vendor page", read: (d) => `read ${d}`, yourPrice: "your price", remove: "Remove", notSelected: "select the tokenizer",
    noPrice: (list) => `No list price in the table for: ${list}. Add your own price to include them.`,
    refNote: (v, d, n) => `From the Arabic Token-Tax Index ${v} (run ${d}) on the UN 2015 test set: ${n} Arabic–English sentence pairs of formal Standard Arabic. These numbers describe that text, not yours. Rows marked “command line” run in the Python tool rather than in this page.`,
    refCols: ["Tokenizer", "Arabic/English ratio (95% CI)", "Tokens per 1,000 Arabic words", "Characters per token, Arabic", "Where to run it"],
    here: "this page", cli: "command line",
    how: [
      "Tokens: each text is encoded on its own with no special tokens (no BOS or EOS), exactly as written; the page does not normalise or clean your text. OpenAI encodings run with js-tiktoken, Hugging Face tokenizer.json files with tokenizers.js.",
      "Words: runs of letters, marks and digits (the wordcount-v1 rule of the Arabic Token-Tax Index). Arabic clitics are not split, so an Arabic text has fewer, longer words than its English parallel. Tokens per word therefore overstates the gap; the Arabic/English ratio compares like with like.",
      "Arabic/English ratio: Arabic tokens ÷ English tokens on the same tokenizer. Above 1, the Arabic version takes more tokens; below 1, fewer.",
      "Characters per token: characters that are not white space ÷ tokens.",
      "Context budget: a text fits when its tokens are at most the budget; otherwise the share that fits is budget ÷ tokens.",
      "Cost: tokens × price per million tokens ÷ 1,000,000 × number of texts. A tokenizer's count applies to the models listed with it. API requests also add tokens for message formatting, which are not counted here.",
      `Parity: on 120 fixture texts with English parallels, and on all of them joined into one text, this page gives the same token ids as the Python reference tool (tiktoken, tokenizers, sentencepiece) for each of its ${BUNDLED.length} tokenizers.`,
      "Tokenizer files are pinned to a revision and checked by SHA-256 when they load.",
    ],
    tlNote: `Licences checked on ${LIC_CHECKED}. The page includes the tokenizers whose licence is MIT or Apache-2.0; their files are served from this page. The others run in the command-line tool, which downloads them from the model repository at the pinned revision. OpenAI rows follow the model-to-encoding table of tiktoken 0.14.0 (gpt-oss checked); other rows list models whose published tokenizer files gave the same counts on the index text.`,
    tlCols: ["Tokenizer", "Models with the same counts", "Source and revision", "Licence", "In this page"],
    yes: "yes", no: "no",
    version: `Version ${VERSION} · ${RELEASED} · tokenizers.js ${LIBS["tokenizers.js"]} · js-tiktoken ${LIBS["js-tiktoken"]} · prices read ${PRICE_DATE}`,
    cite: `Bayanat Labs (2026). Arabic Token-Tax Calculator, version ${VERSION}. https://github.com/Bayanat-Labs/arabic-token-tax-calculator`,
    card: {
      title: "Arabic Token-Tax Calculator",
      ratio1: "tokens for Arabic text compared with its English parallel",
      tpw1: "tokens per word of Arabic text",
      on: (label) => `on ${label}`,
      barsRatio: "Arabic/English token ratio", barsTpw: "Tokens per word",
      foot: "Bayanat Labs Token-Tax Calculator · bayanatlabs.com/tools/token-tax-calculator",
      measured: (d) => `Measured ${d} in the browser`,
    },
  },
  ar: {
    skip: "انتقل إلى النتائج", brand: "بيانات لابز", title: "حاسبة ضريبة التوكنات العربية",
    lede: `الصق نصًا عربيًا، ومعه ترجمته الإنجليزية إن وُجدت، لترى عدد التوكنات التي يستهلكها مع ${BUNDLED.length} مُجزِّئات لنماذج اللغة الكبيرة، وكم يزيد على النص الإنجليزي، وكم منه يتسع في نافذة السياق، وكم يكلّف بأسعار القوائم المعلنة.`,
    privacy: "يبقى نصك في متصفحك: تعمل المُجزِّئات داخل هذه الصفحة، ولا تُحمِّل الصفحة إلا ملفاتها، ولا يُخزَّن أي شيء.",
    inputH: "نصك", examples: "أمثلة", pick: "اختر مثالًا…", arLabel: "النص العربي",
    enLabel: "النص الإنجليزي المقابل (اختياري)", budget: "نافذة السياق بالتوكنات", times: "عدد النصوص لحساب التكلفة",
    toksH: "المُجزِّئات", selAll: "تحديد الكل", clear: "مسح النص",
    loadNote: `يُحمَّل ملف كل مُجزِّئ عند اختياره أول مرة (من ${MIN_MB} إلى ${MAX_MB} ميغابايت).`,
    resultsH: "النتائج", tableH: "حسب المُجزِّئ", viewH: "عرض التوكنات", viewTok: "المُجزِّئ",
    viewNote: "أول 400 توكن. كل قطعة ملوّنة توكن واحد، والقطعة المعلَّمة ×2 أو أكثر تضم توكنات تشترك في حرف واحد. ويشير الخط الأحمر إلى نهاية نافذة السياق.",
    costH: "التكلفة بأسعار القوائم", addPrice: "أضف سعرك", resetPrices: "استعد الأسعار",
    shareH: "بطاقة للمشاركة", shareNote: "صورة PNG بقياس 1200×630 تُرسم داخل هذه الصفحة، فيها الأرقام الرئيسية ومراجعات المُجزِّئات والتاريخ. لا يظهر نصك فيها إلا إذا حددت المربع.",
    includeText: "أدرج أول 80 حرفًا من نصي العربي", cardDraw: "ارسم البطاقة", cardDl: "نزّل صورة PNG",
    refH: "قياسات المؤشر على نص الأمم المتحدة", howH: "طريقة الحساب", tokListH: "المُجزِّئات وتراخيصها", citeH: "طريقة الاستشهاد",
    ctaText: "هل تحتاج بيانات عربية جاهزة للإنتاج وواضحة الحقوق، أو تقييمًا يراعي المُجزِّئ؟ راسلنا على hello@bayanatlabs.com.",
    codeLink: "الشيفرة على GitHub", indexLink: "مؤشر ضريبة الترميز العربية",
    licence: "الشيفرة: Apache-2.0. النصوص الاختبارية وجدول الأسعار ونص الصفحة: CC BY 4.0. تحتفظ ملفات المُجزِّئات بتراخيصها (MIT أو Apache-2.0؛ انظر LICENSES/). الخط: IBM Plex Sans Arabic بترخيص SIL OFL 1.1.",
    toggle: "English",
    hint: "الصق نصًا عربيًا أو اكتبه لترى النتائج.",
    headSel: "المُجزِّئ في العنوان",
    ratioSub: (label, r, a, b) => `مع ${label}، يستهلك النص العربي ${r} ضعف توكنات النص الإنجليزي المقابل (${a} مقابل ${b}).`,
    noEnBig: (n) => `${n} توكن`,
    noEnSub: (label, tpw, cpt) => `مع ${label}: ${tpw} توكن لكل كلمة و${cpt} حرف لكل توكن. أضف النص الإنجليزي المقابل لترى نسبة العربية إلى الإنجليزية.`,
    stats: (s, e) => `العربية: ${s.words} كلمة، ${s.chars} حرفًا، ${s.bytes} بايت` + (e ? ` · الإنجليزية: ${e.words} كلمة، ${e.chars} حرفًا` : ""),
    tooBig: "النص أكبر من 10 ميبيبايت؛ اختصره لقياسه هنا، أو استخدم أداة سطر الأوامر.",
    cols: ["المُجزِّئ", "التوكنات", "توكنات الإنجليزية", "العربية/الإنجليزية", "توكن لكل كلمة", "لكل 1,000 كلمة", "حرف لكل توكن", "نافذة السياق"],
    fits: "يتسع", over: (n, p) => `يزيد ${n} · يتسع ${p}%`,
    loading: "جارٍ التحميل…", waiting: "في الانتظار", failed: "تعذّر التحميل", ready: () => "جاهز",
    budgetNote: (b, label, kept, total) => `بنافذة سياق من ${b} توكن، يحتفظ ${label} بأول ${kept} حرفًا من أصل ${total} في النص العربي.`,
    chartRatio: "نسبة توكنات العربية إلى الإنجليزية (يشير الخط إلى 1: العدد نفسه من التوكنات)",
    chartTpw: "توكن لكل كلمة في النص العربي",
    costNote: (n) => `تكلفة إرسال (سعر الإدخال) وتوليد (سعر الإخراج) ${n} نص مثل هذا النص، بالدولار الأمريكي. الأسعار الافتراضية أسعار قوائم قُرئت من صفحات الشركات في ${PRICE_DATE} (بالتوقيت العالمي)، دون خصومات الدفعات أو التخزين المؤقت أو خارج الذروة؛ وتشير ملاحظة تحت اسم النموذج إلى السعر الترويجي. عدّل أي سعر لتستخدم سعرك؛ تبقى تعديلاتك في هذه الصفحة.`,
    costCols: ["النموذج", "المُجزِّئ", "الإدخال $/مليون", "الإخراج $/مليون", "الإرسال", "الإرسال، إنجليزي", "زيادة العربية", "التوليد", "التوليد، إنجليزي", "زيادة العربية", "مصدر السعر"],
    promo: (d) => `سعر ترويجي، حتى ${dateAr(d)} على الأقل`,
    vendorPage: "صفحة الشركة", read: (d) => `قُرئ في ${d}`, yourPrice: "سعرك", remove: "احذف", notSelected: "اختر المُجزِّئ",
    noPrice: (list) => `لا يوجد سعر قائمة في الجدول لـ: ${list}. أضف سعرك لتضمينها.`,
    refNote: (v, d, n) => `من مؤشر ضريبة الترميز العربية ${v} (تشغيل ${d}) على مجموعة اختبار الأمم المتحدة 2015: ${n} زوجًا من الجمل العربية والإنجليزية بالعربية الفصحى الرسمية. هذه الأرقام تصف ذلك النص لا نصك. الصفوف المعلَّمة «سطر الأوامر» تعمل في أداة Python لا في هذه الصفحة.`,
    refCols: ["المُجزِّئ", "نسبة العربية/الإنجليزية (فترة ثقة 95%)", "توكن لكل 1,000 كلمة عربية", "حرف لكل توكن، عربي", "مكان التشغيل"],
    here: "هذه الصفحة", cli: "سطر الأوامر",
    how: [
      "التوكنات: يُرمَّز كل نص وحده دون توكنات خاصة (لا BOS ولا EOS)، كما كُتب تمامًا؛ فالصفحة لا تطبّع نصك ولا تنظّفه. تعمل ترميزات OpenAI بمكتبة js-tiktoken، وملفات tokenizer.json من Hugging Face بمكتبة tokenizers.js.",
      "الكلمات: سلاسل الحروف والعلامات والأرقام (قاعدة wordcount-v1 في مؤشر ضريبة الترميز العربية). لا تُفصل اللواصق العربية، فيكون عدد كلمات النص العربي أقل وكلماته أطول من النص الإنجليزي المقابل؛ لذلك يبالغ مقياس التوكنات لكل كلمة في الفرق، بينما تقارن نسبة العربية إلى الإنجليزية المحتوى نفسه.",
      "نسبة العربية إلى الإنجليزية: توكنات النص العربي ÷ توكنات النص الإنجليزي على المُجزِّئ نفسه. إذا زادت على 1 استهلكت النسخة العربية توكنات أكثر، وإذا قلّت عنه استهلكت أقل.",
      "حرف لكل توكن: الأحرف غير المسافات ÷ التوكنات.",
      "نافذة السياق: يتسع النص إذا لم تتجاوز توكناته حجم النافذة، وإلا فالجزء الذي يتسع هو حجم النافذة ÷ التوكنات.",
      "التكلفة: التوكنات × السعر لكل مليون توكن ÷ 1,000,000 × عدد النصوص. ينطبق عدد توكنات المُجزِّئ على النماذج المذكورة معه. وتضيف طلبات الواجهات البرمجية توكنات لتنسيق الرسائل لا تُحسب هنا.",
      `التطابق: على 120 نصًا اختباريًا مع نصوصها الإنجليزية المقابلة، وعلى النص الذي يجمعها كلها، تعطي هذه الصفحة أرقام التوكنات نفسها التي تعطيها أداة Python المرجعية (tiktoken وtokenizers وsentencepiece) لكل مُجزِّئ من مُجزِّئاتها الـ${BUNDLED.length}.`,
      "ملفات المُجزِّئات مثبّتة على مراجعة محددة، ويُتحقق منها ببصمة SHA-256 عند تحميلها.",
    ],
    tlNote: `فُحصت التراخيص في ${LIC_CHECKED}. تضم الصفحة المُجزِّئات المرخّصة بترخيص MIT أو Apache-2.0، وتُقدَّم ملفاتها من هذه الصفحة. أما البقية فتعمل في أداة سطر الأوامر التي تنزّلها من مستودع النموذج عند المراجعة المثبّتة. تتبع صفوف OpenAI جدول ربط النماذج بالترميزات في tiktoken 0.14.0 (مع فحص نماذج gpt-oss)، وتذكر الصفوف الأخرى النماذج التي أعطت ملفات مُجزِّئاتها المنشورة الأعداد نفسها على نص المؤشر.`,
    tlCols: ["المُجزِّئ", "نماذج بالأعداد نفسها", "المصدر والمراجعة", "الترخيص", "في هذه الصفحة"],
    yes: "نعم", no: "لا",
    version: `الإصدار ${VERSION} · ${RELEASED} · tokenizers.js ${LIBS["tokenizers.js"]} · js-tiktoken ${LIBS["js-tiktoken"]} · الأسعار في ${PRICE_DATE}`,
    cite: `Bayanat Labs (2026). Arabic Token-Tax Calculator, version ${VERSION}. https://github.com/Bayanat-Labs/arabic-token-tax-calculator`,
    card: {
      title: "حاسبة ضريبة التوكنات العربية",
      ratio1: "توكنات النص العربي مقارنةً بالنص الإنجليزي المقابل",
      tpw1: "توكن لكل كلمة في النص العربي",
      on: (label) => `مع ${label}`,
      barsRatio: "نسبة توكنات العربية إلى الإنجليزية", barsTpw: "توكن لكل كلمة",
      foot: "حاسبة ضريبة التوكنات من بيانات لابز · bayanatlabs.com/tools/token-tax-calculator",
      measured: (d) => `تاريخ القياس: \u2066${d}\u2069، داخل المتصفح`,
    },
  },
};

// ---------------------------------------------------------------- number formatting
const nf = {};
function fmt(x, nd = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return "–";
  const key = String(nd);
  if (!nf[key]) {
    try {
      nf[key] = new Intl.NumberFormat("en-US", { minimumFractionDigits: nd, maximumFractionDigits: nd, roundingMode: "halfEven" });
    } catch (e) {
      nf[key] = new Intl.NumberFormat("en-US", { minimumFractionDigits: nd, maximumFractionDigits: nd });
    }
  }
  return nf[key].format(x);
}
function usd(x) {
  if (x === null || x === undefined) return "–";
  const a = Math.abs(x);
  return "$" + fmt(x, a >= 1 ? 2 : a >= 0.01 ? 4 : 6);
}

// ---------------------------------------------------------------- state
const DEFAULT_SELECTED = ["o200k_base", "qwen3.5", "deepseek", "mistral-tekken", "allam"].filter((id) => BUNDLED.some((t) => t.id === id));
const byId = Object.fromEntries(TOKENIZERS.map((t) => [t.id, t]));
const state = {
  lang: "en",
  selected: new Set(DEFAULT_SELECTED),
  status: {}, // id -> loading | ready | error
  results: {}, // id -> {ar:{tokens,kept_chars}, en:{tokens}, view}
  job: 0,
  headline: "o200k_base",
  view: "o200k_base",
  prices: [],
  custom: [],
  stAr: null,
  stEn: null,
};
function resetPrices() {
  state.prices = PRICES.prices.map((p) => ({ ...p }));
  state.custom = [];
}
resetPrices();
const t = () => T[state.lang];
const ar = () => state.lang === "ar";

// ---------------------------------------------------------------- worker
const worker = new Worker("worker.js", { type: "module" });
const pending = new Map();
let reqSeq = 0;
worker.onmessage = (ev) => {
  const m = ev.data;
  if (m.type === "status") {
    state.status[m.tok] = m.state;
    renderTokStatus();
    if (m.state === "error") renderResults();
  } else if (m.type === "result") {
    if (m.job !== state.job) return;
    state.results[m.tok] = m;
    renderResults();
  } else if (m.type === "ids") {
    const p = pending.get(m.req);
    pending.delete(m.req);
    if (p) (m.error ? p.reject(new Error(m.error)) : p.resolve(m.ids));
  }
};
// For tests and developers: token ids from the page's own tokenizers.
window.tokenTax = {
  version: VERSION,
  encode(tok, texts) {
    const req = ++reqSeq;
    return new Promise((resolve, reject) => {
      pending.set(req, { resolve, reject });
      worker.postMessage({ type: "ids", req, tok, texts });
    });
  },
  textStats,
  results: () => JSON.parse(JSON.stringify(state.results)),
};

// ---------------------------------------------------------------- inputs
const MAX_BYTES = 10 * 1024 * 1024;
let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(run, 250);
}
function budget() {
  const v = parseInt($("budget").value, 10);
  return Number.isFinite(v) && v > 0 ? v : null;
}
function times() {
  const v = parseInt($("times").value, 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}
function selectedIds() {
  return BUNDLED.map((x) => x.id).filter((id) => state.selected.has(id));
}
function run() {
  const a = $("text-ar").value;
  const e = $("text-en").value;
  state.job++;
  state.results = {};
  if (new TextEncoder().encode(a + e).length > MAX_BYTES) {
    state.stAr = null;
    $("text-stats").textContent = t().tooBig;
    renderResults();
    return;
  }
  state.stAr = a.trim() ? textStats(a) : null;
  state.stEn = e.trim() ? textStats(e) : null;
  renderStats();
  if (!state.stAr) { renderResults(); return; }
  const ids = selectedIds();
  if (!state.selected.has(state.view)) state.view = ids[0] || null;
  worker.postMessage({ type: "measure", job: state.job, tokenizers: ids, ar: a, en: state.stEn ? e : null,
    budget: budget(), view: state.view, viewMax: 400 });
  renderResults();
}
function renderStats() {
  $("text-stats").textContent = state.stAr ? t().stats(fmtStats(state.stAr), state.stEn && fmtStats(state.stEn)) : "";
}
function fmtStats(s) {
  return { words: fmt(s.words, 0), chars: fmt(s.chars, 0), bytes: fmt(s.bytes, 0) };
}

// ---------------------------------------------------------------- rendering
function applyStatic() {
  const L = t();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = ar() ? "rtl" : "ltr";
  for (const n of document.querySelectorAll("[data-i18n]")) {
    const v = L[n.dataset.i18n];
    if (typeof v === "string") n.textContent = v;
  }
  const btn = $("lang-toggle");
  btn.textContent = L.toggle;
  btn.lang = ar() ? "en" : "ar";
  btn.dir = ar() ? "ltr" : "rtl";
  $("ar-note").hidden = !ar();
  $("version").textContent = L.version;
  $("cite").textContent = L.cite;
  document.title = `${L.title} – ${L.brand}`;
  const ex = $("examples");
  ex.replaceChildren(el("option", { value: "", text: L.pick }),
    ...EXAMPLES.map((x, i) => el("option", { value: String(i), text: ar() ? x.label_ar : x.label_en })));
  $("how").replaceChildren(...L.how.map((s) => el("li", { text: s })));
  renderToks();
  renderRef();
  renderTokList();
  renderStats();
  renderResults();
}

function renderToks() {
  const box = $("toks");
  const legend = box.querySelector("legend");
  box.replaceChildren(legend);
  for (const tk of BUNDLED) {
    const cb = el("input", { type: "checkbox", value: tk.id, checked: state.selected.has(tk.id) });
    cb.addEventListener("change", () => {
      if (cb.checked) state.selected.add(tk.id); else state.selected.delete(tk.id);
      schedule();
    });
    box.append(el("label", { dir: "ltr" }, cb, el("span", { text: tk.label }), el("span", { class: "st", id: `st-${tk.id}` })));
  }
  renderTokStatus();
}
function renderTokStatus() {
  const L = t();
  for (const tk of BUNDLED) {
    const s = $(`st-${tk.id}`);
    if (!s) continue;
    const st = state.status[tk.id];
    s.textContent = st === "loading" ? L.loading : st === "error" ? L.failed : "";
    s.className = "st" + (st === "error" ? " err" : "");
  }
}

function headlineId() {
  const ids = selectedIds().filter((id) => state.results[id]);
  if (ids.includes(state.headline)) return state.headline;
  return ids[0] || null;
}

function measuresFor(id) {
  const r = state.results[id];
  if (!r || !state.stAr) return null;
  const b = budget();
  const out = { ar: sideMeasures(r.ar.tokens, state.stAr, b), kept_chars: r.ar.kept_chars };
  if (r.en && state.stEn) {
    out.en = sideMeasures(r.en.tokens, state.stEn, b);
    out.ratio = r.en.tokens ? r.ar.tokens / r.en.tokens : null;
  }
  return out;
}

function renderResults() {
  const L = t();
  const head = $("headline");
  const ids = selectedIds();
  const hasEn = !!state.stEn;
  // headline
  const hid = headlineId();
  if (!state.stAr) {
    head.replaceChildren(el("p", { class: "hint", text: L.hint }));
  } else if (!hid) {
    head.replaceChildren(el("p", { class: "hint", text: L.loading }));
  } else {
    const m = measuresFor(hid);
    const label = byId[hid].label;
    const sel = el("select", { id: "head-tok", "aria-label": L.headSel });
    for (const id of ids.filter((x) => state.results[x])) sel.append(el("option", { value: id, text: byId[id].label, selected: id === hid }));
    sel.addEventListener("change", () => { state.headline = sel.value; renderResults(); });
    if (hasEn && m.ratio !== null && m.en) {
      head.replaceChildren(el("p", { class: "big", text: `${fmt(m.ratio)}×` }),
        el("p", { class: "sub", text: L.ratioSub(label, fmt(m.ratio), fmt(m.ar.tokens, 0), fmt(m.en.tokens, 0)) }),
        el("label", { class: "lbl" }, `${L.headSel} `, sel));
    } else {
      head.replaceChildren(el("p", { class: "big", text: L.noEnBig(fmt(m.ar.tokens, 0)) }),
        el("p", { class: "sub", text: L.noEnSub(label, fmt(m.ar.tokens_per_word), fmt(m.ar.chars_per_token)) }),
        el("label", { class: "lbl" }, `${L.headSel} `, sel));
    }
  }
  // table
  const cols = L.cols.filter((_, i) => hasEn || (i !== 2 && i !== 3)).filter((_, i, arr) => budget() || arr[i] !== L.cols[7]);
  $("table").tHead.replaceChildren(el("tr", {}, ...cols.map((c, i) => el("th", { scope: "col", class: i ? "n" : null, text: c }))));
  const body = $("table").tBodies[0];
  body.replaceChildren();
  let budgetNote = "";
  for (const id of ids) {
    const tk = byId[id];
    const m = measuresFor(id);
    const tr = el("tr", {}, el("th", { scope: "row", dir: "ltr" }, tk.label, el("span", { class: "t", text: tk.revision_short })));
    if (!m) {
      const st = state.status[id];
      tr.append(el("td", { class: "n", colspan: String(cols.length - 1), text: !state.stAr ? "" : st === "error" ? L.failed : st === "ready" ? "…" : L.loading }));
    } else {
      tr.append(el("td", { class: "n", text: fmt(m.ar.tokens, 0) }));
      if (hasEn) {
        tr.append(el("td", { class: "n", text: m.en ? fmt(m.en.tokens, 0) : "–" }));
        tr.append(el("td", { class: "n", text: m.ratio !== undefined ? fmt(m.ratio) : "–" }));
      }
      tr.append(el("td", { class: "n", text: fmt(m.ar.tokens_per_word) }));
      tr.append(el("td", { class: "n", text: fmt(m.ar.tokens_per_1000_words, 0) }));
      tr.append(el("td", { class: "n", text: fmt(m.ar.chars_per_token) }));
      if (budget()) {
        const fits = m.ar.fits_budget;
        tr.append(el("td", { class: "n" }, el("span", { class: fits ? "fit" : "over", text: fits ? L.fits : L.over(fmt(m.ar.overflow_tokens, 0), fmt(100 * m.ar.kept_share, 1)) })));
        if (!fits && id === hid && m.kept_chars !== null && m.kept_chars !== undefined) {
          budgetNote = L.budgetNote(fmt(budget(), 0), tk.label, fmt(m.kept_chars, 0), fmt(state.stAr.codepoints, 0));
        }
      }
    }
    body.append(tr);
  }
  $("budget-note").textContent = budgetNote;
  renderChart();
  renderView();
  renderCosts();
}

function renderChart() {
  const L = t();
  const hasEn = !!state.stEn;
  $("chart-h").textContent = hasEn ? L.chartRatio : L.chartTpw;
  const rows = selectedIds().map((id) => ({ id, m: measuresFor(id) })).filter((x) => x.m);
  const val = (x) => (hasEn ? x.m.ratio : x.m.ar.tokens_per_word);
  const vals = rows.map(val).filter((v) => v !== null && v !== undefined);
  const max = Math.max(hasEn ? 1.2 : 0, ...vals) * 1.05;
  rows.sort((a, b) => (val(a) ?? 0) - (val(b) ?? 0));
  const box = $("chart");
  box.setAttribute("aria-label", rows.map((x) => `${byId[x.id].label}: ${fmt(val(x))}`).join("; "));
  box.replaceChildren(...rows.map((x) => {
    const v = val(x) ?? 0;
    // Widths are set through the CSSOM: the page's Content-Security-Policy blocks style attributes.
    const fill = el("div", { class: "fill" });
    fill.style.setProperty("width", `${(100 * v) / max}%`);
    const track = el("div", { class: "track" }, fill);
    if (hasEn) {
      const one = el("div", { class: "one" });
      one.style.setProperty("inset-inline-start", `${100 / max}%`);
      track.append(one);
    }
    return el("div", { class: "bar" }, el("span", { class: "name", dir: "ltr", text: byId[x.id].label }), track, el("span", { class: "v", text: fmt(v) }));
  }));
}

function renderView() {
  const sel = $("view-tok");
  const ids = selectedIds();
  sel.replaceChildren(...ids.map((id) => el("option", { value: id, text: byId[id].label, selected: id === state.view })));
  const box = $("view");
  const r = state.view && state.results[state.view];
  if (!r || !r.view) { box.replaceChildren(); return; }
  const b = budget();
  let count = 0;
  const kids = [];
  for (const p of r.view) {
    const chip = el("bdi", { class: "tk", title: `${count + 1}${p.n > 1 ? `–${count + p.n}` : ""}` }, p.text.replace(/\n/g, "↵\n"));
    if (p.n > 1) chip.append(el("sub", { text: `×${p.n}` }));
    kids.push(chip);
    const before = count;
    count += p.n;
    if (b && before < b && count >= b && r.ar.tokens > b) kids.push(el("span", { class: "cut", "aria-hidden": "true" }));
  }
  box.replaceChildren(...kids);
}

function renderCosts() {
  const L = t();
  const hasEn = !!state.stEn;
  const n = times();
  $("cost-note").textContent = L.costNote(fmt(n, 0));
  const cols = L.costCols.filter((_, i) => hasEn || ![5, 6, 8, 9].includes(i));
  $("costs").tHead.replaceChildren(el("tr", {}, ...cols.map((c, i) => el("th", { scope: "col", class: i >= 2 && i < cols.length - 1 ? "n" : null, text: c }))));
  const body = $("costs").tBodies[0];
  body.replaceChildren();
  const rows = [...state.prices.map((p) => ({ p, custom: false })), ...state.custom.map((p) => ({ p, custom: true }))];
  rows.forEach(({ p, custom }, idx) => {
    const tr = el("tr");
    const tokSel = el("select", { "aria-label": L.costCols[1] });
    for (const tk of BUNDLED) tokSel.append(el("option", { value: tk.id, text: tk.label, selected: tk.id === p.tokenizer_id }));
    if (custom) {
      tokSel.addEventListener("change", () => { p.tokenizer_id = tokSel.value; renderCosts(); });
      tr.append(el("td", {}, el("span", { text: L.yourPrice })), el("td", {}, tokSel));
    } else {
      tr.append(el("th", { scope: "row", dir: "ltr" }, el("code", { text: p.model }), el("span", { class: "t", text: p.vendor }),
        p.promotional_through ? el("span", { class: "t promo", dir: ar() ? "rtl" : "ltr", text: L.promo(p.promotional_through) }) : null),
        el("td", { dir: "ltr", text: byId[p.tokenizer_id].label }));
    }
    const inp = (key) => {
      const i = el("input", { type: "number", min: "0", step: "0.01", value: String(p[key]), "aria-label": key === "input_usd_per_mtok" ? L.costCols[2] : L.costCols[3] });
      i.addEventListener("input", () => { const v = parseFloat(i.value); p[key] = Number.isFinite(v) && v >= 0 ? v : 0; renderCostCells(); });
      return el("td", { class: "n" }, i);
    };
    tr.append(inp("input_usd_per_mtok"), inp("output_usd_per_mtok"));
    for (let k = 0; k < (hasEn ? 6 : 2); k++) tr.append(el("td", { class: "n cost" }));
    if (custom) {
      const rm = el("button", { type: "button", class: "btn small", text: L.remove });
      rm.addEventListener("click", () => { state.custom.splice(state.custom.indexOf(p), 1); renderCosts(); });
      tr.append(el("td", {}, rm));
    } else {
      tr.append(el("td", {}, el("a", { href: p.source_url, target: "_blank", rel: "noopener", text: L.vendorPage }), el("span", { class: "t", text: L.read(p.checked_at.slice(0, 10)) })));
    }
    tr.dataset.idx = String(idx);
    tr._p = p;
    body.append(tr);
  });
  renderCostCells();
  const missing = PRICES.no_price.map((x) => byId[x.tokenizer_id]).filter((x) => x && x.asset).map((x) => x.label);
  $("no-price").textContent = missing.length ? L.noPrice(missing.join(", ")) : "";
}
function renderCostCells() {
  const L = t();
  const hasEn = !!state.stEn;
  const n = times();
  for (const tr of $("costs").tBodies[0].rows) {
    const p = tr._p;
    const m = state.selected.has(p.tokenizer_id) ? measuresFor(p.tokenizer_id) : null;
    const cells = tr.querySelectorAll("td.cost");
    let vals;
    if (!m) {
      vals = Array(cells.length).fill(state.stAr && !state.selected.has(p.tokenizer_id) ? L.notSelected : "–");
    } else {
      const sa = (m.ar.tokens * p.input_usd_per_mtok) / 1e6 * n, ga = (m.ar.tokens * p.output_usd_per_mtok) / 1e6 * n;
      if (hasEn && m.en) {
        const se = (m.en.tokens * p.input_usd_per_mtok) / 1e6 * n, ge = (m.en.tokens * p.output_usd_per_mtok) / 1e6 * n;
        vals = [usd(sa), usd(se), usd(sa - se), usd(ga), usd(ge), usd(ga - ge)];
      } else {
        vals = [usd(sa), usd(ga)];
      }
    }
    cells.forEach((c, i) => { c.textContent = vals[i] ?? "–"; });
  }
}

function renderRef() {
  const L = t();
  const r0 = IDX;
  $("ref-note").textContent = L.refNote(r0.index_version, r0.run_date, fmt(r0.pairs, 0));
  $("ref").tHead.replaceChildren(el("tr", {}, ...L.refCols.map((c, i) => el("th", { scope: "col", class: i && i < 4 ? "n" : null, text: c }))));
  const rows = [...TOKENIZERS].sort((a, b) => a.index_reference.ratio - b.index_reference.ratio);
  $("ref").tBodies[0].replaceChildren(...rows.map((tk) => {
    const x = tk.index_reference;
    return el("tr", { class: tk.asset ? null : "ref" },
      el("th", { scope: "row", dir: "ltr", text: tk.label }),
      el("td", { class: "n", text: `${fmt(x.ratio)} (${fmt(x.ratio_ci95[0])}–${fmt(x.ratio_ci95[1])})` }),
      el("td", { class: "n", text: fmt(x.tokens_per_1000_ar_words, 0) }),
      el("td", { class: "n", text: fmt(x.chars_per_token_ar) }),
      el("td", { text: tk.asset ? L.here : L.cli }));
  }));
}

function renderTokList() {
  const L = t();
  $("tl-note").textContent = L.tlNote;
  $("toklist").tHead.replaceChildren(el("tr", {}, ...L.tlCols.map((c) => el("th", { scope: "col", text: c }))));
  $("toklist").tBodies[0].replaceChildren(...TOKENIZERS.map((tk) => el("tr", {},
    el("th", { scope: "row", dir: "ltr" }, tk.label, el("span", { class: "t", text: tk.vendor })),
    el("td", { dir: "ltr", text: tk.models.join(", ") }),
    el("td", { dir: "ltr" }, el("a", { href: tk.source_url, target: "_blank", rel: "noopener" }, el("code", { text: tk.source }))),
    el("td", { dir: "ltr" }, el("a", { href: tk.licence_url, target: "_blank", rel: "noopener", text: tk.licence })),
    el("td", { text: tk.asset ? L.yes : L.no }))));
}

// ---------------------------------------------------------------- share card
// Split `text` into lines no wider than `max` pixels in the current canvas font.
function wrap(g, text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && g.measureText(next).width > max) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
async function drawCard() {
  const L = t();
  const C = L.card;
  const hid = headlineId();
  if (!hid || !state.stAr) return;
  try { await document.fonts.load("600 40px 'Plex Arabic'"); await document.fonts.load("400 20px 'Plex Arabic'"); } catch (e) { /* system font */ }
  const cv = $("card");
  const g = cv.getContext("2d");
  const W = 1200, H = 630, P = 64;
  const rtl = ar();
  const font = (w, s) => `${w} ${s}px 'Plex Arabic', system-ui, sans-serif`;
  const X = (x) => (rtl ? W - x : x);
  const align = (a) => (rtl ? (a === "left" ? "right" : a === "right" ? "left" : a) : a);
  g.direction = rtl ? "rtl" : "ltr";
  g.fillStyle = "#0e0e12"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#8b85ff"; g.fillRect(rtl ? W - 12 : 0, 0, 12, H);
  // brand mark
  const mx = rtl ? W - P - 44 : P, my = 44;
  g.save(); g.translate(mx, my); g.scale(44 / 64, 44 / 64);
  g.fillStyle = "#ececf1"; g.beginPath(); g.moveTo(32, 6); g.arc(32, 32, 26, -Math.PI / 2, Math.PI / 2, true); g.closePath(); g.fill();
  for (const [cx, cy] of [[38, 16], [38, 32], [38, 48], [46, 24], [46, 40]]) { g.beginPath(); g.arc(cx, cy, 3, 0, 2 * Math.PI); g.fill(); }
  g.fillStyle = "#8b85ff"; g.beginPath(); g.arc(54, 32, 3, 0, 2 * Math.PI); g.fill();
  g.restore();
  g.fillStyle = "#ececf1"; g.font = font(600, 26); g.textAlign = align("left"); g.textBaseline = "middle";
  g.fillText(`${L.brand} · ${C.title}`, X(P + 60), my + 22);

  const m = measuresFor(hid);
  const hasRatio = !!(state.stEn && m.en && m.ratio !== null);
  const big = hasRatio ? `${fmt(m.ratio)}×` : fmt(m.ar.tokens_per_word);
  g.fillStyle = "#8b85ff"; g.font = font(600, 120); g.textBaseline = "alphabetic"; g.textAlign = align("left");
  g.save(); g.direction = "ltr"; g.textAlign = rtl ? "right" : "left"; g.fillText(big, X(P), 250); g.restore();
  g.fillStyle = "#ececf1"; g.font = font(600, 30);
  let ly = 300;
  for (const line of wrap(g, hasRatio ? C.ratio1 : C.tpw1, 580)) { g.fillText(line, X(P), ly); ly += 40; }
  g.fillStyle = "#a3a3b2"; g.font = font(400, 26);
  g.fillText(C.on(byId[hid].label), X(P), ly + 2);

  // bars
  const rows = selectedIds().map((id) => ({ id, m: measuresFor(id) })).filter((x) => x.m && (!hasRatio || (x.m.ratio !== null && x.m.ratio !== undefined)));
  const val = (x) => (hasRatio ? x.m.ratio : x.m.ar.tokens_per_word);
  rows.sort((a, b) => val(a) - val(b));
  const shown = rows.slice(0, 7);
  const bx = rtl ? P : 700, bw = 436, top = 132;
  g.fillStyle = "#a3a3b2"; g.font = font(400, 20); g.textAlign = align("left");
  g.fillText(hasRatio ? C.barsRatio : C.barsTpw, rtl ? bx + bw : bx, top);
  const max = Math.max(hasRatio ? 1.2 : 0, ...shown.map(val)) * 1.05;
  shown.forEach((x, i) => {
    const y = top + 26 + i * 40;
    const v = val(x);
    g.fillStyle = "#ececf1"; g.font = font(400, 18);
    g.save(); g.direction = "ltr"; g.textAlign = "left"; g.fillText(byId[x.id].label, bx, y + 14); g.restore();
    const tx = bx, ty = y + 20, tw = bw - 70;
    g.fillStyle = "#24224a"; g.fillRect(tx, ty, tw, 10);
    g.fillStyle = x.id === hid ? "#8b85ff" : "#5d58c9"; g.fillRect(tx, ty, (tw * v) / max, 10);
    if (hasRatio) { g.fillStyle = "#ececf1"; g.fillRect(tx + (tw * 1) / max, ty - 4, 2, 18); }
    g.fillStyle = "#ececf1"; g.font = font(600, 18);
    g.save(); g.direction = "ltr"; g.textAlign = "right"; g.fillText(fmt(v), bx + bw, y + 30); g.restore();
  });

  // optional text
  let y = Math.max(440, ly + 70);
  if ($("card-text").checked) {
    const cps = Array.from($("text-ar").value.replace(/\s+/g, " ").trim());
    const snippet = cps.slice(0, 80).join("") + (cps.length > 80 ? "…" : "");
    g.save(); g.direction = "rtl"; g.textAlign = "right"; g.fillStyle = "#ececf1"; g.font = font(400, 24);
    g.fillText(`«${snippet}»`, W - P, y, W - 2 * P); g.restore();
    y += 40;
  }
  // footer: revisions, date, address
  const revs = rows.map((x) => (byId[x.id].route === "tiktoken" ? x.id : `${x.id}@${byId[x.id].revision_short}`)).join(" · ");
  g.save(); g.direction = "ltr"; g.textAlign = "left"; g.fillStyle = "#a3a3b2"; g.font = `400 17px ui-monospace, Menlo, Consolas, monospace`;
  g.fillText(revs, P, 520, W - 2 * P); g.restore();
  g.fillStyle = "#a3a3b2"; g.font = font(400, 20); g.textAlign = align("left");
  g.fillText(C.measured(today()), X(P), 556);
  g.fillStyle = "#ececf1"; g.font = font(600, 22);
  g.fillText(C.foot, X(P), 590, W - 2 * P);

  const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
  const url = URL.createObjectURL(blob);
  const img = $("card-img");
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.src = url; img.dataset.url = url; img.alt = `${hasRatio ? C.ratio1 : C.tpw1}: ${big}, ${C.on(byId[hid].label)}`;
  img.hidden = false;
  const a = $("card-dl");
  a.href = url; a.download = `arabic-token-tax-${hid}-${today()}.png`; a.hidden = false;
}

// ---------------------------------------------------------------- wiring
function init() {
  const q = new URLSearchParams(location.search);
  if (q.get("lang") === "ar") state.lang = "ar";
  $("lang-toggle").addEventListener("click", () => {
    state.lang = ar() ? "en" : "ar";
    const u = new URL(location.href);
    if (ar()) u.searchParams.set("lang", "ar"); else u.searchParams.delete("lang");
    try { history.replaceState(null, "", u); } catch (e) { /* sandboxed frame */ }
    applyStatic();
  });
  $("examples").addEventListener("change", (ev) => {
    const x = EXAMPLES[+ev.target.value];
    if (!x) return;
    $("text-ar").value = x.ar; $("text-en").value = x.en;
    schedule();
  });
  for (const id of ["text-ar", "text-en", "budget"]) $(id).addEventListener("input", schedule);
  $("times").addEventListener("input", () => renderCosts());
  $("view-tok").addEventListener("change", (ev) => { state.view = ev.target.value; schedule(); });
  $("sel-all").addEventListener("click", () => { for (const tk of BUNDLED) state.selected.add(tk.id); renderToks(); schedule(); });
  $("clear").addEventListener("click", () => { $("text-ar").value = ""; $("text-en").value = ""; $("examples").value = ""; $("card-img").hidden = true; $("card-dl").hidden = true; run(); });
  $("add-price").addEventListener("click", () => {
    state.custom.push({ model: "", vendor: "custom", tokenizer_id: selectedIds()[0] || BUNDLED[0].id, input_usd_per_mtok: 1, output_usd_per_mtok: 4 });
    renderCosts();
  });
  $("reset-prices").addEventListener("click", () => { resetPrices(); renderCosts(); });
  $("card-draw").addEventListener("click", () => { drawCard(); });
  const first = EXAMPLES[0];
  $("text-ar").value = first.ar; $("text-en").value = first.en;
  applyStatic();
  $("examples").value = "0";
  run();
}
init();

# Kindle Book Reader

A personal, installable (PWA) book reader. Upload any EPUB or PDF, read it, and double-click any word to see its dictionary meaning.

## Features
- Upload EPUB and PDF files (stored locally in your browser via IndexedDB, nothing is uploaded to a server)
- Library with reading progress; resumes where you left off
- Double-click (or double-tap) a word to get its definition, from a bundled offline WordNet dictionary (short, modern, plain-English meanings)
- Installable: "Install app" / "Add to Home Screen" in the browser; reader and dictionary work offline after the first download
- Arrow keys or the buttons turn pages; PDF has zoom

## Run
```bash
npm install
npm run dev       # development
npm run build     # production build in dist/
npm run preview   # serve the build
```

## Deploy
Any static host works. On Vercel: import the repo, framework "Vite", build `npm run build`, output `dist`.

## Notes
- English dictionary: about 83,000 words, bundled in 26 letter files (about 12 MB, roughly 3.6 MB compressed). No external definition requests, API keys, or user-book uploads.
- Open the app online once and wait for "Ready for offline reading". The service worker downloads the app, both reader engines and all dictionary files. Offline mode needs browser storage to remain available.
- On phones: double-tap a word or long-press to select a single word. On desktop: double-click.
- WordNet covers everyday and literary English but not slang, brand names or most very recent terms; common endings (-s, -ed, -ing, -er) and irregular forms (went, mice) are matched to the base word. Missing words show a clear message; there is no online fallback.
- Scanned PDFs without a text layer cannot be word-selected.

## Dictionary source and license

Definitions come from [Princeton WordNet 3.0](https://wordnet.princeton.edu/),
[download](https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz). WordNet is free to use,
copy and redistribute under the Princeton license, which must stay with the data; it is included in
[`public/dictionary/LICENSE.txt`](public/dictionary/LICENSE.txt). WordNet is a trademark-free
research database; Princeton's name may not be used to promote derived products.
`scripts/prepare-dictionary.py /path/to/WordNet-3.0` rebuilds `public/dictionary/` (up to 5 senses per
part of speech, most common part of speech first, plus a short hand-written list of function words
such as "the" and "of" that WordNet omits).

## Regression tests

`npm run test:e2e` builds and tests actual EPUB/PDF uploads, desktop double-click and offline lookup in Chromium.
Set `TARGET=https://your-deployment` to test a deployed build.

### Real-book spread regression

`tests/spread.mjs` checks actual text rectangles on both sides of the gutter (and none crossing it), dark and light EPUB content colors, phone resizing, text sizing, EPUB CFI resume, and PDF page-pair resume. It uses real multi-chapter EPUB/PDF files, not the short dictionary fixture:

```sh
curl -fL https://www.gutenberg.org/ebooks/2554.epub3.images -o /tmp/crime.epub
curl -fL https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf -o /tmp/paper.pdf
npm run build
node tests/server.mjs
# In another shell (CHROME defaults to /usr/bin/google-chrome):
EPUB_FIXTURE=/tmp/crime.epub PDF_FIXTURE=/tmp/paper.pdf node tests/spread.mjs
# TARGET=https://kindle-book-reader-eight.vercel.app runs the same checks on production.
```

EPUB pagination takes priority over the publisher's spread metadata. The gutter appears only when epub.js is actually showing two columns. Content backgrounds and text colors are set inside every EPUB document, including new chapters and theme changes, so publisher white backgrounds cannot wash out dark-mode text. Book images are kept as images; image colors are not inverted.

### Phone reading

On phones up to 600px wide, books open in an immersive single-page view.
Tap the middle of the page to show or hide the library, size, theme, and progress
controls. Swipe left/right or tap either edge to turn pages. Double-tap a word
for the offline dictionary. A single tap waits briefly so it does not interfere
with double-tap lookup. The controls reserve their own space while visible,
rather than covering the text. PDFs keep the original printed page layout;
use the size buttons to zoom, then scroll a zoomed page.

Mobile regression check with a real multi-chapter EPUB and PDF:
`EPUB_FIXTURE=/path/book.epub PDF_FIXTURE=/path/book.pdf node tests/mobile.mjs`
Set `TARGET` to check a deployment and `OUTPUT` to choose the screenshot prefix.

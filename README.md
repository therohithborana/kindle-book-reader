# Kindle Book Reader

A personal, installable (PWA) book reader. Upload any EPUB or PDF, read it, and double-click any word to see its dictionary meaning.

## Features
- Upload EPUB and PDF files (stored locally in your browser via IndexedDB, nothing is uploaded to a server)
- Library with reading progress; resumes where you left off
- Double-click (or double-tap) a word to get its definition, from a bundled offline Webster dictionary
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
- English dictionary: 99,118 entries, bundled in 26 letter files (about 28 MB before HTTP compression). No external definition requests, API keys, or user-book uploads.
- Open the app online once and wait for "Ready for offline reading". The service worker downloads the app, both reader engines and all dictionary files. Offline mode needs browser storage to remain available.
- On phones: double-tap a word or long-press to select a single word. On desktop: double-click.
- The historical dictionary misses modern terms, some inflections and slang, and contains old-fashioned wording. Missing words show a clear message; there is no online fallback.
- Scanned PDFs without a text layer cannot be word-selected.

## Dictionary source and license

Definitions are parsed directly from [Webster's Unabridged Dictionary,
Project Gutenberg #29765](https://www.gutenberg.org/ebooks/29765),
[plain text edition](https://www.gutenberg.org/cache/epub/29765/pg29765.txt).
The historical text is public domain in the USA. All source notices and the
complete Project Gutenberg terms are included in
[`public/dictionary/LICENSE.txt`](public/dictionary/LICENSE.txt).
No GPL parser or JSON dataset is used. `scripts/prepare-dictionary.py` is our
parser: it preserves entry sections, lowercases headwords and splits by letter.
The Project Gutenberg notice says users outside the USA should check local
copyright law. Do not remove the included license and source notices.

## Regression tests

`npm run test:e2e` builds and tests actual EPUB/PDF uploads, desktop double-click and offline lookup in Chromium.
Set `TARGET=https://your-deployment` to test a deployed build.

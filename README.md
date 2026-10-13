# Kindle Book Reader

A personal, installable (PWA) book reader. Upload any EPUB or PDF, read it, and double-click any word to see its dictionary meaning.

## Features
- Upload EPUB and PDF files (stored locally in your browser via IndexedDB, nothing is uploaded to a server)
- Library with reading progress; resumes where you left off
- Double-click (or double-tap) a word to get its definition, from [dictionaryapi.dev](https://dictionaryapi.dev)
- Installable: "Install app" / "Add to Home Screen" in the browser; app shell works offline
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
- Definitions need internet (English only); looked-up words are cached for the session.
- Scanned PDFs without a text layer cannot be word-selected.

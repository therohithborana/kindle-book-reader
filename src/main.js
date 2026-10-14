import './style.css';
import { beginReading, setChrome } from './reading-ui.js';
import 'pdfjs-dist/web/pdf_viewer.css';
import { initSettings } from './settings.js';
import { putBook, getBook, allBooks, deleteBook } from './db.js';
import { getProgress, setProgress, clearProgress, getLastOpen, setLastOpen } from './progress.js';

const $ = (id) => document.getElementById(id);
const els = { pos: $('pos'), prev: $('prev'), next: $('next'), fill: $('barFill') };
try { navigator.storage?.persist?.(); } catch {}
initSettings();
let cleanup = null;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function meta(file, data) {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  let title = file.name.replace(/\.(epub|pdf)$/i, '');
  if (!isPdf) {
    try {
      const { default: ePub } = await import('epubjs');
      const b = ePub(data.slice(0));
      const m = await b.loaded.metadata;
      if (m.title) title = m.title + (m.creator ? ' - ' + m.creator : '');
      await b.ready;
      b.destroy();
    } catch {}
  }
  return { type: isPdf ? 'pdf' : 'epub', title };
}

$('file').onchange = async (e) => {
  for (const f of e.target.files) {
    const data = await f.arrayBuffer();
    const m = await meta(f, data);
    await putBook({ id: crypto.randomUUID(), ...m, data, added: Date.now(), percent: 0, location: null });
  }
  e.target.value = '';
  renderLibrary();
};

const pick = (p) => (p ? { ...(p.percent != null ? { percent: p.percent } : {}), t: p.t } : {});

async function renderLibrary() {
  const books = (await allBooks()).map((b) => ({ ...b, ...pick(getProgress(b.id)) })).sort((a, b) => (b.t || b.added) - (a.t || a.added));
  $('empty').hidden = books.length > 0;
  $('books').innerHTML = books.map((b) => `
    <div class="card" data-id="${b.id}">
      <div class="cover ${b.type}"><span class="ctitle">${esc(b.title.split(' - ')[0])}</span><span class="ctype">${b.type.toUpperCase()}</span></div>
      <div class="meta"><div class="t">${esc(b.title)}</div>
      <div class="prog"><i style="width:${b.percent || 0}%"></i></div>
      <div class="muted">${b.percent ? (b.percent >= 99 ? 'Finished' : b.percent + '% read · Continue') : 'New'}</div></div>
      <button class="del" data-del="${b.id}" aria-label="Delete">🗑</button>
    </div>`).join('');
}

$('books').onclick = async (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { if (confirm('Delete this book?')) { await deleteBook(del.dataset.del); clearProgress(del.dataset.del); if (getLastOpen() === del.dataset.del) setLastOpen(null); renderLibrary(); } return; }
  const card = e.target.closest('.card');
  if (card) openBook(card.dataset.id);
};

async function openBook(id) {
  const book = await getBook(id);
  if (!book) { setLastOpen(null); return; }
  // Resume from the last saved position (saved synchronously on every page turn).
  const saved = getProgress(id);
  if (saved && saved.location) { book.location = saved.location; book.percent = saved.percent ?? book.percent; }
  setLastOpen(id); setProgress(id, {});
  $('library').hidden = true; $('reader').hidden = false; beginReading();
  $('title').textContent = book.title;
  const view = $('view'); view.innerHTML = '';
  view.className = book.type;
  const save = (p) => { Object.assign(book, p); setProgress(id, p); };
  const mod = book.type === 'pdf' ? await import('./pdf.js') : await import('./epub.js');
  cleanup = await (book.type === 'pdf' ? mod.openPdf : mod.openEpub)(book, view, els, save);
}

$('back').onclick = () => {
  if (cleanup) cleanup(); cleanup = null;
  $('popup').hidden = true; setLastOpen(null);
  $('reader').hidden = true; $('library').hidden = false; setChrome(true);
  $('view').innerHTML = '';
  renderLibrary();
};

renderLibrary().then(() => { const last = getLastOpen(); if (last) openBook(last); });

// A controlling worker has completed its precache, including all dictionary letters.
if ('serviceWorker' in navigator) {
  const ready = () => { $('offlineStatus').textContent = 'Ready for offline reading and dictionary lookup.'; };
  if (navigator.serviceWorker.controller) ready();
  navigator.serviceWorker.addEventListener('controllerchange', ready);
} else {
  $('offlineStatus').textContent = 'Offline storage is not supported by this browser.';
}

import './style.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import { putBook, getBook, allBooks, deleteBook } from './db.js';

const $ = (id) => document.getElementById(id);
const els = { pos: $('pos'), prev: $('prev'), next: $('next'), zoomIn: $('zoomIn'), zoomOut: $('zoomOut') };
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

async function renderLibrary() {
  const books = (await allBooks()).sort((a, b) => b.added - a.added);
  $('empty').hidden = books.length > 0;
  $('books').innerHTML = books.map((b) => `
    <div class="card" data-id="${b.id}">
      <div class="cover ${b.type}">${b.type.toUpperCase()}</div>
      <div class="meta"><div class="t">${esc(b.title)}</div>
      <div class="muted">${b.percent || 0}% read</div></div>
      <button class="del" data-del="${b.id}" aria-label="Delete">🗑</button>
    </div>`).join('');
}

$('books').onclick = async (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { if (confirm('Delete this book?')) { await deleteBook(del.dataset.del); renderLibrary(); } return; }
  const card = e.target.closest('.card');
  if (card) openBook(card.dataset.id);
};

async function openBook(id) {
  const book = await getBook(id);
  $('library').hidden = true; $('reader').hidden = false;
  $('title').textContent = book.title;
  document.querySelectorAll('.pdfonly').forEach((x) => (x.hidden = book.type !== 'pdf'));
  const view = $('view'); view.innerHTML = '';
  view.className = book.type;
  const save = (p) => { Object.assign(book, p); putBook(book); };
  const mod = book.type === 'pdf' ? await import('./pdf.js') : await import('./epub.js');
  cleanup = await (book.type === 'pdf' ? mod.openPdf : mod.openEpub)(book, view, els, save);
}

$('back').onclick = () => {
  if (cleanup) cleanup(); cleanup = null;
  $('popup').hidden = true;
  $('reader').hidden = true; $('library').hidden = false;
  $('view').innerHTML = '';
  renderLibrary();
};

renderLibrary();

import ePub from 'epubjs';
import { showMeaning, wordFromSelection } from './popup.js';

export async function openEpub(book, container, els, onProgress) {
  const b = ePub(book.data);
  const rendition = b.renderTo(container, { width: '100%', height: '100%', flow: 'paginated', spread: 'none' });
  rendition.hooks.content.register((contents) => {
    const doc = contents.document;
    doc.addEventListener('dblclick', () => showMeaning(wordFromSelection(contents.window)));
    // Allow word selection / touch double-tap
    doc.documentElement.style.webkitUserSelect = 'text';
  });
  await rendition.display(book.location || undefined);
  await b.ready;
  b.locations.generate(1200).then(() => update(rendition.currentLocation()));
  const update = (loc) => {
    if (!loc || !loc.start) return;
    const pct = b.locations.length() ? Math.round(b.locations.percentageFromCfi(loc.start.cfi) * 100) : null;
    els.pos.textContent = pct === null ? '' : pct + '%';
    onProgress({ location: loc.start.cfi, percent: pct });
  };
  rendition.on('relocated', update);
  els.prev.onclick = () => rendition.prev();
  els.next.onclick = () => rendition.next();
  const key = (e) => { if (e.key === 'ArrowLeft') rendition.prev(); if (e.key === 'ArrowRight') rendition.next(); };
  document.addEventListener('keyup', key);
  rendition.on('keyup', key);
  return () => { document.removeEventListener('keyup', key); rendition.destroy(); b.destroy(); };
}

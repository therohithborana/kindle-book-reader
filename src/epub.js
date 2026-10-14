import ePub from 'epubjs';
import { onSettings, getSettings } from './settings.js';
import { bindWordLookup } from './popup.js';

const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";

export async function openEpub(book, container, els, onProgress) {
  const b = ePub(book.data);
  await b.ready;
  // epub.js lets package metadata override renderTo's spread option. Reader preference wins.
  b.package.metadata.spread = 'auto';
  // Two facing pages on wide screens (like a Kindle on a tablet or laptop), one page on phones.
  const rendition = b.renderTo(container, { width: '100%', height: '100%', flow: 'paginated', spread: 'auto', minSpreadWidth: 780, gap: 72 });
  const stage = container.parentElement;
  const unbinds = [];
  let settings = getSettings();
  const paint = (contents) => {
    const dark = settings.theme === 'dark';
    const doc = contents.document;
    doc.documentElement.dataset.readerTheme = dark ? 'dark' : 'light';
    doc.documentElement.style.setProperty('--reader-ink', dark ? '#d9d4c8' : '#2b2620');
    doc.documentElement.style.setProperty('color-scheme', dark ? 'dark' : 'light');
    // Inline important rules beat publisher backgrounds, including inline styles.
    for (const node of [doc.documentElement, doc.body, ...doc.body.querySelectorAll('*')]) {
      node.style.setProperty('background-color', 'transparent', 'important');
      node.style.setProperty('background-image', 'none', 'important');
      node.style.setProperty('color', 'var(--reader-ink)', 'important');
    }
  };
  rendition.hooks.content.register((contents) => {
    const doc = contents.document;
    unbinds.push(bindWordLookup(doc, contents.window));
    doc.documentElement.style.webkitUserSelect = 'text';
    const st = doc.createElement('style');
    st.textContent = `html,body{background:transparent !important}
      body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;hyphens:auto;-webkit-hyphens:auto}
      p{text-align:justify;margin:0 0 .15em;text-indent:1.4em} p:first-of-type,h1+p,h2+p,h3+p{text-indent:0}
      img,svg{max-width:100%;max-height:92vh;height:auto}
      ::selection{background:rgba(180,120,40,.28)}`;
    doc.head.appendChild(st);
    paint(contents);
    // Swipe to turn pages on touch screens.
    let sx = 0, sy = 0, st0 = 0;
    doc.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st0 = Date.now(); }, { passive: true });
    doc.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st0 < 600 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) (dx < 0 ? rendition.next() : rendition.prev());
    }, { passive: true });
    doc.addEventListener('keyup', key);
  });
  rendition.hooks.layout.register((view) => {
    const body = view.contents.document.body;
    // Keep publisher !important rules from flattening the reader's columns.
    for (const prop of ['width', 'height', 'column-width', 'column-gap', 'column-fill', 'box-sizing']) {
      const value = body.style.getPropertyValue(prop);
      if (value) body.style.setProperty(prop, value, 'important');
    }
  });
  const stopSettings = onSettings((next) => {
    settings = next;
    rendition.themes.fontSize(next.size + '%');
    rendition.themes.override('font-family', SERIF, true);
    rendition.themes.override('line-height', '1.65', true);
    rendition.getContents().forEach(paint);
  });
  // Use the actual pagination divisor, never a separate decorative breakpoint.
  const updateSpread = () => stage.classList.toggle('spread', rendition._layout?.divisor === 2);
  rendition.on('layout', updateSpread);
  rendition.on('rendered', updateSpread);
  rendition.on('resized', updateSpread);

  let pct = book.percent || 0;
  const update = (loc) => {
    if (!loc || !loc.start) return;
    if (b.locations.length()) pct = Math.round(b.locations.percentageFromCfi(loc.start.cfi) * 100);
    els.pos.textContent = pct + '%';
    els.fill.style.width = pct + '%';
    onProgress({ location: loc.start.cfi, percent: pct });
  };
  rendition.on('relocated', update);
  // Resume exactly where the reader stopped (the saved CFI), falling back to the start.
  try { await rendition.display(book.location || undefined); } catch { await rendition.display(); }
  els.pos.textContent = pct + '%'; els.fill.style.width = pct + '%';
  update(rendition.currentLocation());
  b.ready.then(() => b.locations.generate(1200)).then(() => update(rendition.currentLocation())).catch(() => {});
  els.prev.onclick = () => rendition.prev();
  els.next.onclick = () => rendition.next();
  function key(e) { if (e.key === 'ArrowLeft') rendition.prev(); if (e.key === 'ArrowRight') rendition.next(); }
  document.addEventListener('keyup', key);
  return () => { stopSettings(); unbinds.forEach((u) => u()); document.removeEventListener('keyup', key); rendition.destroy(); b.destroy(); };
}

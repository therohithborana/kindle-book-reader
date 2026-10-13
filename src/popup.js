import { lookup } from './dict.js';
const pop = document.getElementById('popup');
const body = document.getElementById('popBody');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let request = 0;
let activeWord = '';
document.getElementById('close').onclick = () => { pop.hidden = true; activeWord = ''; request++; };

export async function showMeaning(word) {
  word = (word || '').trim().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z'-]+$/gi, '');
  if (!word || /\s/.test(word)) return;
  if (!pop.hidden && activeWord === word.toLowerCase()) return;
  activeWord = word.toLowerCase();
  const current = ++request;
  pop.hidden = false;
  body.innerHTML = `<h2>${esc(word)}</h2><p class="muted">Looking up…</p>`;
  try {
    const r = await lookup(word);
    if (current !== request || pop.hidden) return;
    if (!r || !r.meanings.length) { body.innerHTML = `<h2>${esc(word)}</h2><p>This word is not in the bundled offline dictionary.</p>`; return; }
    body.innerHTML = `<h2>${esc(r.word)} <small>${esc(r.phonetic)}</small></h2>` + r.meanings.map((m) =>
      `<h3>${esc(m.pos)}</h3><ol>` + m.defs.map((d) => `<li>${esc(d.def)}${d.ex ? `<div class="ex">"${esc(d.ex)}"</div>` : ''}</li>`).join('') + '</ol>').join('');
  } catch (e) {
    if (current !== request || pop.hidden) return;
    activeWord = '';
    body.innerHTML = `<h2>${esc(word)}</h2><p>The offline dictionary is not downloaded yet. Open the app online once, then try again.</p>`;
  }
}

// Select the word under a double-click and look it up.
export function wordFromSelection(win) {
  const s = win.getSelection && win.getSelection();
  return s ? s.toString().trim() : '';
}

// Read the word at the pointer, including inside an EPUB's own document.
// Mobile browsers often do not select text on double-tap, so selection alone
// is not enough. A long-press selection is supported as a second touch route.
export function bindWordLookup(doc, win) {
  let lastTap = null;
  let selectionTimer;
  function atPoint(x, y) {
    const caret = doc.caretPositionFromPoint?.(x, y);
    const range = caret ? null : doc.caretRangeFromPoint?.(x, y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    if (!node || node.nodeType !== 3) return '';
    const text = node.textContent;
    for (const match of text.matchAll(/[a-z]+(?:['’-][a-z]+)*/gi)) {
      if (offset >= match.index && offset <= match.index + match[0].length) return match[0];
    }
    return '';
  }
  const doubleClick = (e) => {
    const word = atPoint(e.clientX, e.clientY) || wordFromSelection(win);
    showMeaning(word);
  };
  const pointerUp = (e) => {
    if (e.pointerType !== 'touch') return;
    const now = Date.now();
    if (lastTap && now - lastTap.time < 450 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28) {
      showMeaning(atPoint(e.clientX, e.clientY) || wordFromSelection(win));
      lastTap = null;
    } else lastTap = { time: now, x: e.clientX, y: e.clientY };
  };
  const selectionChange = () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const word = wordFromSelection(win);
      if (/^[a-z]+(?:['’-][a-z]+)*[.,!?;:]?$/i.test(word)) showMeaning(word);
    }, 350);
  };
  doc.addEventListener('dblclick', doubleClick);
  doc.addEventListener('pointerup', pointerUp);
  doc.addEventListener('selectionchange', selectionChange);
  return () => {
    clearTimeout(selectionTimer);
    doc.removeEventListener('dblclick', doubleClick);
    doc.removeEventListener('pointerup', pointerUp);
    doc.removeEventListener('selectionchange', selectionChange);
  };
}

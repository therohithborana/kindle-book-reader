import { lookup } from './dict.js';
const pop = document.getElementById('popup');
const body = document.getElementById('popBody');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let request = 0;
let activeWord = '';
let anchor = null;
const docs = new Set();

export function hidePopup() {
  if (pop.hidden) return;
  pop.hidden = true; activeWord = ''; request++; anchor = null;
  docs.forEach((d) => { try { d.getSelection()?.removeAllRanges(); } catch {} });
}
// Tapping anywhere outside the popup dismisses it.
document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target)) hidePopup(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePopup(); });
window.addEventListener('resize', () => place());

// Put the card next to the word: below it, or above when there is no room.
function place() {
  if (pop.hidden || !anchor) return;
  const vw = window.innerWidth, vh = window.innerHeight, m = 12;
  const w = Math.min(250, vw - m * 2);
  pop.style.width = w + 'px';
  const h = pop.offsetHeight;
  const cx = (anchor.left + anchor.right) / 2;
  const left = Math.max(m, Math.min(vw - w - m, cx - w / 2));
  const below = vh - anchor.bottom - 10, above = anchor.top - 10;
  let top, up = false;
  if (h <= below || below >= above) top = anchor.bottom + 10; else { top = anchor.top - 10 - h; up = true; }
  top = Math.max(m, Math.min(vh - h - m, top));
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  pop.classList.toggle('up', up);
  pop.style.setProperty('--arrow-x', Math.max(18, Math.min(w - 18, cx - left)) + 'px');
}

export async function showMeaning(word, rect) {
  word = (word || '').trim().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z'-]+$/gi, '');
  if (!word || /\s/.test(word)) return;
  if (!pop.hidden && activeWord === word.toLowerCase()) return;
  activeWord = word.toLowerCase();
  const current = ++request;
  anchor = rect || { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 3, bottom: innerHeight / 3 };
  pop.hidden = false;
  body.innerHTML = `<h2>${esc(word)}</h2><p class="muted">Looking up…</p>`;
  place();
  try {
    const r = await lookup(word);
    if (current !== request || pop.hidden) return;
    if (!r || !r.meanings.length) body.innerHTML = `<h2>${esc(word)}</h2><p>This word is not in the bundled offline dictionary.</p>`;
    else {
      const definition = (d) => `<li>${esc(d.def)}${d.ex ? `<div class="ex">"${esc(d.ex)}"</div>` : ''}</li>`;
      const first = r.meanings[0];
      const rest = r.meanings.map((m, i) => ({ ...m, defs: i === 0 ? m.defs.slice(2) : m.defs })).filter((m) => m.defs.length);
      body.innerHTML = `<h2>${esc(r.word)} <small>${esc(r.phonetic)}</small></h2><h3>${esc(first.pos)}</h3><ol>${first.defs.slice(0, 2).map(definition).join('')}</ol>` +
        (rest.length ? `<details><summary>More meanings</summary>${rest.map((m) => `<h3>${esc(m.pos)}</h3><ol>${m.defs.slice(0, 3).map(definition).join('')}</ol>`).join('')}</details>` : '');
      body.querySelector('details')?.addEventListener('toggle', place);
    }
  } catch (e) {
    if (current !== request || pop.hidden) return;
    activeWord = '';
    body.innerHTML = `<h2>${esc(word)}</h2><p>The offline dictionary is not downloaded yet. Open the app online once, then try again.</p>`;
  }
  place();
}

export function wordFromSelection(win) {
  const s = win.getSelection && win.getSelection();
  return s ? s.toString().trim() : '';
}

// Word lookup routes: double-click with a mouse, press-and-hold (long-press)
// with touch. A single tap never looks a word up, so taps can drive the
// reading controls and page turns without firing the dictionary.
let longPressAt = 0;
// True briefly after a long-press lookup fired, so the reading-gesture
// handler can ignore that press's release instead of toggling controls.
export function consumedByLongPress() { return Date.now() - longPressAt < 800; }

// Read the word at the pointer, including inside an EPUB's own document.
// Touch long-press uses the point directly (mobile browsers often do not
// select text on their own); a native long-press selection stays as a
// second touch route through the selectionchange handler below.
export function bindWordLookup(doc, win) {
  docs.add(doc);
  let press = null;
  let pressTimer;
  let selectionTimer;
  // Chrome also fires dblclick for a double TAP on touch screens; the pointer
  // type of the press tells mouse double-clicks apart from those.
  let lastPointerType = 'mouse';
  // Rect of the word in main-window coordinates (adds the EPUB iframe offset).
  function toMain(r) {
    const f = win.frameElement ? win.frameElement.getBoundingClientRect() : { left: 0, top: 0 };
    return { left: r.left + f.left, right: r.right + f.left, top: r.top + f.top, bottom: r.bottom + f.top };
  }
  function atPoint(x, y) {
    const caret = doc.caretPositionFromPoint?.(x, y);
    const range = caret ? null : doc.caretRangeFromPoint?.(x, y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    if (!node || node.nodeType !== 3) return null;
    const text = node.textContent;
    for (const match of text.matchAll(/[a-z]+(?:['’-][a-z]+)*/gi)) {
      if (offset >= match.index && offset <= match.index + match[0].length) {
        const r = doc.createRange(); r.setStart(node, match.index); r.setEnd(node, match.index + match[0].length);
        return { word: match[0], rect: toMain(r.getBoundingClientRect()) };
      }
    }
    return null;
  }
  const selected = () => {
    const word = wordFromSelection(win);
    let rect = null;
    try { rect = toMain(win.getSelection().getRangeAt(0).getBoundingClientRect()); } catch {}
    return { word, rect };
  };
  const lookupAt = (x, y) => { const h = atPoint(x, y) || selected(); showMeaning(h.word, h.rect); };
  const doubleClick = (e) => { if (lastPointerType === 'touch') return; lookupAt(e.clientX, e.clientY); };
  // Press and hold a word for its meaning. Moving the finger (scroll, swipe)
  // or lifting it early cancels the lookup, so ordinary taps and page-turn
  // gestures never trigger it.
  const longPressDown = (e) => {
    lastPointerType = e.pointerType || 'mouse';
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    if (e.target.closest?.('button, a')) return;
    press = { x: e.clientX, y: e.clientY };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      press = null;
      longPressAt = Date.now();
      lookupAt(e.clientX, e.clientY);
    }, 500);
  };
  const longPressMove = (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(pressTimer); press = null; }
  };
  const longPressEnd = () => { clearTimeout(pressTimer); press = null; };
  // Keep long-press on a phone from opening the native link/image menu.
  const noMenu = (e) => { if (matchMedia('(max-width: 600px)').matches) e.preventDefault(); };
  const pointerDown = () => hidePopup();
  const selectionChange = () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const s = selected();
      if (/^[a-z]+(?:['’-][a-z]+)*[.,!?;:]?$/i.test(s.word)) showMeaning(s.word, s.rect);
    }, 350);
  };
  doc.addEventListener('dblclick', doubleClick);
  doc.addEventListener('pointerdown', longPressDown);
  doc.addEventListener('pointermove', longPressMove);
  doc.addEventListener('pointerup', longPressEnd);
  doc.addEventListener('pointercancel', longPressEnd);
  doc.addEventListener('contextmenu', noMenu);
  doc.addEventListener('pointerdown', pointerDown, true);
  doc.addEventListener('selectionchange', selectionChange);
  return () => {
    clearTimeout(selectionTimer); clearTimeout(pressTimer); docs.delete(doc);
    doc.removeEventListener('dblclick', doubleClick);
    doc.removeEventListener('pointerdown', longPressDown);
    doc.removeEventListener('pointermove', longPressMove);
    doc.removeEventListener('pointerup', longPressEnd);
    doc.removeEventListener('pointercancel', longPressEnd);
    doc.removeEventListener('contextmenu', noMenu);
    doc.removeEventListener('pointerdown', pointerDown, true);
    doc.removeEventListener('selectionchange', selectionChange);
  };
}

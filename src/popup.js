import { lookup } from './dict.js';
const pop = document.getElementById('popup');
const body = document.getElementById('popBody');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
document.getElementById('close').onclick = () => (pop.hidden = true);

export async function showMeaning(word) {
  word = (word || '').trim();
  if (!word || /\s/.test(word)) return;
  pop.hidden = false;
  body.innerHTML = `<h2>${esc(word)}</h2><p class="muted">Looking up…</p>`;
  try {
    const r = await lookup(word);
    if (!r || !r.meanings.length) { body.innerHTML = `<h2>${esc(word)}</h2><p>No definition found.</p>`; return; }
    body.innerHTML = `<h2>${esc(r.word)} <small>${esc(r.phonetic)}</small></h2>` + r.meanings.map((m) =>
      `<h3>${esc(m.pos)}</h3><ol>` + m.defs.map((d) => `<li>${esc(d.def)}${d.ex ? `<div class="ex">"${esc(d.ex)}"</div>` : ''}</li>`).join('') + '</ol>').join('');
  } catch (e) {
    body.innerHTML = `<h2>${esc(word)}</h2><p>Could not load the definition (offline?).</p>`;
  }
}

// Select the word under a double-click and look it up.
export function wordFromSelection(win) {
  const s = win.getSelection && win.getSelection();
  return s ? s.toString().trim() : '';
}

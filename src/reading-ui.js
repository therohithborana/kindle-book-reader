import { hidePopup, consumedByLongPress } from './popup.js';
const reader = document.getElementById('reader');
export const isPhone = () => matchMedia('(max-width: 600px)').matches;
export function setChrome(visible) {
  reader.classList.toggle('chrome-visible', visible);
  reader.querySelector('header').inert = isPhone() && !visible;
  document.getElementById('foot').inert = isPhone() && !visible;
}
export function beginReading() { hidePopup(); setChrome(!isPhone()); }
// A single tap acts immediately: center toggles the reading controls, edges
// turn the page, swipes turn the page. Word lookup lives on long-press, so a
// tap never fires the dictionary; a press that did fire a long-press lookup is
// consumed here so lifting the finger does nothing extra.
export function bindReadingGestures(doc, win, prev, next, root = doc) {
  let start;
  const down = e => {
    if (e.target.closest('button, a, #popup, header, footer')) return;
    start = { x:e.clientX, y:e.clientY, time:Date.now(), dismiss:!document.getElementById('popup').hidden };
  };
  const up = e => {
    if (!start) return;
    const s = start; start = null;
    if (consumedByLongPress()) return;
    const dx = e.clientX-s.x, dy = e.clientY-s.y;
    if (Date.now()-s.time > 600) return;
    if (root.scrollWidth > root.clientWidth + 4 && root !== doc) return;
    if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.6) {
      hidePopup(); setChrome(false); (dx<0?next:prev)(); return;
    }
    if (Math.hypot(dx,dy)>12 || !isPhone() || s.dismiss) return;
    if (!document.getElementById('popup').hidden || win.getSelection()?.toString().trim()) return;
    const f = win.frameElement?.getBoundingClientRect();
    const x=e.clientX+(f?.left||0), width=window.innerWidth;
    if (x<width*.15 || x>width*.85) { hidePopup(); setChrome(false); (x<width*.15?prev:next)(); }
    else setChrome(!reader.classList.contains('chrome-visible'));
  };
  const cancel=()=>{start=null;};
  root.addEventListener('pointerdown',down); root.addEventListener('pointerup',up); root.addEventListener('pointercancel',cancel);
  return ()=>{cancel();root.removeEventListener('pointerdown',down);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);};
}
matchMedia('(max-width: 600px)').addEventListener('change', () => setChrome(!isPhone()));
document.addEventListener('keydown',e=>{if(!reader.hidden && e.key==='Escape')setChrome(!reader.classList.contains('chrome-visible'));});

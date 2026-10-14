import * as pdfjs from 'pdfjs-dist';
import { bindReadingGestures, isPhone, setChrome } from './reading-ui.js';
import { TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { onSettings, getSettings } from './settings.js';
import { bindWordLookup } from './popup.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(book, container, els, onProgress) {
  const pdf = await pdfjs.getDocument({ data: book.data.slice(0) }).promise;
  let page = Math.min(Math.max(1, Number(book.location) || 1), pdf.numPages);
  let size = getSettings().size;
  let gen = 0;
  const stage = container.parentElement;
  container.innerHTML = '<div class="spreadwrap"></div>';
  const holder = container.firstChild;
  const unbind = bindWordLookup(document, window);
  const spreadMode = () => container.clientWidth >= 880 && pdf.numPages > 1;

  async function render() {
    const my = ++gen;
    const two = spreadMode();
    stage.classList.toggle('spread', two);
    // In a spread the left page is always odd, so facing pages stay paired like a printed book.
    if (two && page % 2 === 0) page -= 1;
    const nums = two ? [page, page + 1].filter((n) => n <= pdf.numPages) : [page];
    const pages = await Promise.all(nums.map((n) => pdf.getPage(n)));
    if (my !== gen) return;
    const W = container.clientWidth - (isPhone() ? 0 : 24), H = container.clientHeight - (isPhone() ? 0 : 24);
    const base = pages[0].getViewport({ scale: 1 });
    const fit = Math.min(W / (two ? 2 : 1) / base.width, H / base.height);
    const scale = Math.max(0.3, fit) * size / 100;
    container.style.touchAction = size > 100 ? 'pan-x pan-y' : 'pan-y';
    const dpr = window.devicePixelRatio || 1;
    const built = pages.map((p) => {
      const vp = p.getViewport({ scale });
      const wrap = document.createElement('div');
      wrap.className = 'pdfwrap';
      wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
      wrap.style.setProperty('--scale-factor', vp.scale);
      wrap.innerHTML = '<canvas></canvas><div class="textLayer"></div>';
      const canvas = wrap.firstChild;
      canvas.width = vp.width * dpr; canvas.height = vp.height * dpr;
      canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
      return { p, vp, wrap, canvas, tl: wrap.lastChild };
    });
    holder.replaceChildren(...built.map((x) => x.wrap));
    holder.classList.toggle('two', two);
    const total = pdf.numPages;
    const label = nums.length > 1 ? `${nums[0]}–${nums[1]} / ${total}` : `${nums[0]} / ${total}`;
    els.pos.textContent = label;
    const percent = Math.round(((nums[nums.length - 1]) / total) * 100);
    els.fill.style.width = percent + '%';
    onProgress({ location: page, percent });
    container.scrollTop = 0;
    await Promise.all(built.map(async ({ p, vp, canvas, tl }) => {
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
      if (my !== gen) return;
      const tc = await p.getTextContent();
      await new TextLayer({ textContentSource: tc, container: tl, viewport: vp }).render();
    }));
  }
  const step = () => (spreadMode() ? 2 : 1);
  const go = (n) => { n = Math.max(1, Math.min(pdf.numPages, n)); if (n !== page) { page = n; render(); } };
  els.prev.onclick = () => { setChrome(false); go(page - step()); };
  els.next.onclick = () => { setChrome(false); go(page + step()); };
  const stopSettings = onSettings(({ size: s }) => { if (s !== size) { size = s; render(); } });
  let rt; const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(render, 150); }); ro.observe(container);
  const key = (e) => { if (e.key === 'ArrowLeft') els.prev.onclick(); if (e.key === 'ArrowRight') els.next.onclick(); };
  document.addEventListener('keyup', key);
  const stopGestures = bindReadingGestures(document, window, () => els.prev.onclick(), () => els.next.onclick(), container);
  await render();
  return () => { clearTimeout(rt); ro.disconnect(); stopSettings(); document.removeEventListener('keyup', key); stopGestures(); unbind(); pdf.destroy(); };
}

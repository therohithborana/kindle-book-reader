import * as pdfjs from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { showMeaning, wordFromSelection } from './popup.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(book, container, els, onProgress) {
  const pdf = await pdfjs.getDocument({ data: book.data.slice(0) }).promise;
  let page = book.location || 1;
  let scale = 1.4;
  let task;
  container.innerHTML = '<div class="pdfwrap"><canvas></canvas><div class="textLayer"></div></div>';
  const canvas = container.querySelector('canvas');
  const tl = container.querySelector('.textLayer');
  tl.addEventListener('dblclick', () => showMeaning(wordFromSelection(window)));

  async function render() {
    const p = await pdf.getPage(page);
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(scale, (container.clientWidth - 16) / p.getViewport({ scale: 1 }).width * Math.max(scale / 1.4, 1));
    const vp = p.getViewport({ scale: Math.min(scale, fit > 0 ? Math.max(fit, 0.5) : scale) });
    canvas.width = vp.width * dpr; canvas.height = vp.height * dpr;
    canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
    const wrap = container.querySelector('.pdfwrap');
    wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
    wrap.style.setProperty('--scale-factor', vp.scale);
    if (task) task.cancel?.();
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await p.render({ canvasContext: ctx, viewport: vp }).promise;
    tl.innerHTML = '';
    const tc = await p.getTextContent();
    await new TextLayer({ textContentSource: tc, container: tl, viewport: vp }).render();
    els.pos.textContent = `${page} / ${pdf.numPages}`;
    onProgress({ location: page, percent: Math.round((page / pdf.numPages) * 100) });
    container.scrollTop = 0;
  }
  const go = (n) => { if (n >= 1 && n <= pdf.numPages) { page = n; render(); } };
  els.prev.onclick = () => go(page - 1);
  els.next.onclick = () => go(page + 1);
  els.zoomIn.onclick = () => { scale = Math.min(scale + 0.2, 4); render(); };
  els.zoomOut.onclick = () => { scale = Math.max(scale - 0.2, 0.6); render(); };
  const key = (e) => { if (e.key === 'ArrowLeft') go(page - 1); if (e.key === 'ArrowRight') go(page + 1); };
  document.addEventListener('keyup', key);
  await render();
  return () => { document.removeEventListener('keyup', key); pdf.destroy(); };
}

// Reading position per book. localStorage is synchronous, so a position is
// never lost when the app is closed or killed mid-save.
const key = (id) => 'kbr-progress-' + id;
export const getProgress = (id) => { try { return JSON.parse(localStorage.getItem(key(id))); } catch { return null; } };
export const setProgress = (id, p) => {
  try { localStorage.setItem(key(id), JSON.stringify({ ...(getProgress(id) || {}), ...p, t: Date.now() })); } catch {}
};
export const clearProgress = (id) => { try { localStorage.removeItem(key(id)); } catch {} };
const LAST = 'kbr-last-open';
export const getLastOpen = () => { try { return localStorage.getItem(LAST); } catch { return null; } };
export const setLastOpen = (id) => { try { id ? localStorage.setItem(LAST, id) : localStorage.removeItem(LAST); } catch {} };

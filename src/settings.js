// Theme (light/dark) and text size, saved in this browser.
const listeners = new Set();
const MOON = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const KEY = 'reader-settings';
const MIN = 70, MAX = 220, STEP = 10;
let state = { theme: null, size: 100 };
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
if (!state.theme) state.theme = matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
function apply() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', state.theme === 'dark' ? '#14120f' : '#f3ecdc');
  document.querySelectorAll('.theme-toggle').forEach((b) => { b.innerHTML = state.theme === 'dark' ? SUN : MOON; b.title = state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; });
  const v = document.getElementById('sizeVal'); if (v) v.textContent = state.size + '%';
  listeners.forEach((fn) => fn({ ...state }));
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} apply(); }
export const getSettings = () => ({ ...state });
export const toggleTheme = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); };
export const changeSize = (delta) => { state.size = Math.min(MAX, Math.max(MIN, state.size + delta * STEP)); save(); };
export function onSettings(fn) { listeners.add(fn); fn({ ...state }); return () => listeners.delete(fn); }
export function initSettings() {
  document.querySelectorAll('.theme-toggle').forEach((b) => (b.onclick = toggleTheme));
  document.getElementById('sizeDown').onclick = () => changeSize(-1);
  document.getElementById('sizeUp').onclick = () => changeSize(1);
  apply();
}

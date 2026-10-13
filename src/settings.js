// Theme (light/dark) and text size, saved in this browser.
const listeners = new Set();
const KEY = 'reader-settings';
const MIN = 70, MAX = 220, STEP = 10;
let state = { theme: null, size: 100 };
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
if (!state.theme) state.theme = matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
function apply() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', state.theme === 'dark' ? '#111418' : '#1f2937');
  document.querySelectorAll('.theme-toggle').forEach((b) => { b.textContent = state.theme === 'dark' ? '☀' : '🌙'; b.title = state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; });
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

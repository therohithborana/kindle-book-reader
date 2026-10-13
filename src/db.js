// Tiny IndexedDB wrapper: books (metadata + file blob) and progress.
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open('kbr', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('books', { keyPath: 'id' });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction('books', mode);
    const out = fn(t.objectStore('books'));
    t.oncomplete = () => res(out && out.result);
    t.onerror = () => rej(t.error);
  });
};
export const putBook = (b) => tx('readwrite', (s) => s.put(b));
export const getBook = (id) => tx('readonly', (s) => s.get(id));
export const allBooks = () => tx('readonly', (s) => s.getAll());
export const deleteBook = (id) => tx('readwrite', (s) => s.delete(id));

const cache = new Map();
export async function lookup(word) {
  const w = word.toLowerCase().replace(/^[^a-z]+|[^a-z'-]+$/gi, '');
  if (!w) return null;
  if (cache.has(w)) return cache.get(w);
  const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w));
  if (r.status === 404) { const none = { word: w, meanings: [] }; cache.set(w, none); return none; }
  if (!r.ok) throw new Error('Dictionary error ' + r.status);
  const data = await r.json();
  const e = data[0];
  const phonetic = e.phonetic || (e.phonetics.find((p) => p.text) || {}).text || '';
  const res = {
    word: e.word, phonetic,
    meanings: e.meanings.map((m) => ({
      pos: m.partOfSpeech,
      defs: m.definitions.slice(0, 3).map((d) => ({ def: d.definition, ex: d.example }))
    }))
  };
  cache.set(w, res);
  return res;
}

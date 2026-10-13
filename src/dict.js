// Locally bundled WordNet dictionary (Princeton WordNet 3.0). No network lookups.
const chunks = new Map();
async function load(name) {
  if (!chunks.has(name)) {
    const request = fetch(`${import.meta.env.BASE_URL}dictionary/${name}.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Offline dictionary has not finished downloading.');
        return response.json();
      }).catch((error) => { chunks.delete(name); throw error; });
    chunks.set(name, request);
  }
  return chunks.get(name);
}
const has = (dict, w) => Object.hasOwn(dict, w);
async function entry(w) {
  const dict = await load(w[0]);
  return has(dict, w) ? dict[w] : null;
}

// Regular English endings, tried only when the word itself is not an entry.
const RULES = [
  ['ies', 'y'], ['ied', 'y'], ['ier', 'y'], ['iest', 'y'], ['ses', 's'], ['xes', 'x'], ['zes', 'z'], ['ches', 'ch'], ['shes', 'sh'],
  ['men', 'man'], ['s', ''], ['es', ''], ['es', 'e'], ['ed', ''], ['ed', 'e'], ['ing', ''], ['ing', 'e'], ['er', ''], ['er', 'e'], ['est', ''], ['est', 'e'], ['ly', ''],
];
function stems(w) {
  const out = [];
  for (const [end, add] of RULES) {
    if (w.length - end.length < 3 || !w.endsWith(end)) continue;
    const stem = w.slice(0, -end.length) + add;
    out.push(stem);
    // running -> run, bigger -> big
    if (/([^aeiou])\1$/.test(w.slice(0, -end.length))) out.push(w.slice(0, -end.length - 1) + add);
  }
  return [...new Set(out)];
}

export async function lookup(word) {
  const w = word.toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z'-]+$/gi, '').replace(/'s$/, '');
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(w)) return null;
  const meanings = [];
  const add = (pos, senses) => meanings.push({ pos, defs: senses.map(([def, ex]) => ({ def, ex })) });
  const exact = await entry(w);
  if (exact) exact.forEach(([pos, senses]) => add(pos, senses));
  let note = '';
  const forms = await load('forms');
  let bases = has(forms, w) ? forms[w] : [];
  if (!exact && !bases.length) {
    for (const stem of stems(w)) { if (await entry(stem)) { bases = [stem]; break; } }
  }
  for (const base of bases.slice(0, 2)) {
    const e = await entry(base);
    if (!e) continue;
    note = note ? `${note}, ${base}` : `form of ${base}`;
    e.slice(0, exact ? 1 : 2).forEach(([pos, senses]) => add(bases.length > 1 || exact ? `${pos} (${base})` : pos, senses));
  }
  return { word: w, phonetic: note, meanings };
}

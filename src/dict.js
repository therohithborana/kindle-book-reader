// Locally bundled Webster dictionary. No third-party requests or API keys.
const chunks = new Map();
async function loadLetter(letter) {
  if (!chunks.has(letter)) {
    const request = fetch(`${import.meta.env.BASE_URL}dictionary/${letter}.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Offline dictionary has not finished downloading.');
        return response.json();
      }).catch((error) => { chunks.delete(letter); throw error; });
    chunks.set(letter, request);
  }
  return chunks.get(letter);
}
export async function lookup(word) {
  const w = word.toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z'-]+$/gi, '');
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(w)) return null;
  const dictionary = await loadLetter(w[0]);
  let definition = Object.hasOwn(dictionary, w) ? dictionary[w] : null;
  const crossRef = definition?.match(/(?:^|Defn: )See ([a-z'-]+)\.(?:$|\n)/i);
  if (crossRef) {
    const other = await loadLetter(crossRef[1][0].toLowerCase());
    const linked = other[crossRef[1].toLowerCase()];
    if (linked) definition += ' ' + linked;
  }
  return { word: w, phonetic: '', meanings: definition ? [{ pos: 'Webster dictionary (offline)', defs: [{ def: definition }] }] : [] };
}

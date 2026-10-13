"""Usage: python3 scripts/prepare-dictionary.py /path/to/pg29765.txt
Source: https://www.gutenberg.org/cache/epub/29765/pg29765.txt
Parses public-domain Webster text, preserving all entry sections and notices.
"""
import json, pathlib, re, sys
source = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8-sig')
start = re.search(r'\*\*\* START OF .*?\*\*\*', source)
end = re.search(r'\*\*\* END OF .*?\*\*\*', source)
text = source[start.end():end.start()]
entries = list(re.finditer(r"^([A-Z][A-Z' ;-]*)\n", text, re.M))
words = {}
for i, entry in enumerate(entries):
    body = text[entry.end():entries[i + 1].start() if i + 1 < len(entries) else len(text)].strip()
    if not body: continue
    body = re.sub(r'(?<!\n)\n(?!\n)', ' ', body)
    for word in entry.group(1).split(';'):
        word = word.strip().lower()
        if re.fullmatch(r"[a-z]+(?:['-][a-z]+)*", word):
            words[word] = words.get(word, '') + ('\n\n' if word in words else '') + body
out = pathlib.Path('public/dictionary'); out.mkdir(parents=True, exist_ok=True)
for letter in 'abcdefghijklmnopqrstuvwxyz':
    chunk = {w: d for w, d in words.items() if w.startswith(letter)}
    (out / (letter + '.json')).write_text(json.dumps(chunk, ensure_ascii=False, separators=(',', ':')))
(out / 'LICENSE.txt').write_text(source[:start.start()] + '\n\n' + source[end.start():])
print(f'{len(words):,} words; {sum(p.stat().st_size for p in out.glob("*.json")):,} bytes')

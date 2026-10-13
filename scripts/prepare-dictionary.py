"""Build the offline dictionary from Princeton WordNet 3.0.

Usage: python3 scripts/prepare-dictionary.py /path/to/WordNet-3.0
Source: https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz
Output: public/dictionary/<letter>.json  {word: [[pos, [[meaning, example?], ...]], ...]}
        public/dictionary/forms.json     {irregular form: [base word, ...]}
        public/dictionary/LICENSE.txt    WordNet license (must stay with the data)
"""
import json, pathlib, re, sys

root = pathlib.Path(sys.argv[1]) / 'dict'
POS = {'noun': 'noun', 'verb': 'verb', 'adj': 'adjective', 'adv': 'adverb'}
MAX_SENSES = 5
OK = re.compile(r"[a-z]+(?:['-][a-z]+)*")

def parse_data(name):
    out = {}
    for line in (root / f'data.{name}').read_text(encoding='utf-8').splitlines():
        if line.startswith('  '): continue
        head, _, gloss = line.partition(' | ')
        offset = head.split()[0]
        parts = [p.strip() for p in gloss.split(';')]
        meanings, example = [], ''
        for p in parts:
            if p.startswith('"'):
                if not example: example = p.strip('"')
            elif p: meanings.append(p)
        out[offset] = (('; '.join(meanings)), example)
    return out

words = {}
for name, label in POS.items():
    data = parse_data(name)
    for line in (root / f'index.{name}').read_text(encoding='utf-8').splitlines():
        if line.startswith('  '): continue
        f = line.split()
        lemma, p_cnt = f[0], int(f[3])
        if not OK.fullmatch(lemma): continue
        n_sense = int(f[4 + p_cnt])
        offsets = f[6 + p_cnt:6 + p_cnt + n_sense]
        senses = []
        for i, o in enumerate(offsets[:MAX_SENSES]):
            meaning, example = data[o]
            if not meaning: continue
            senses.append([meaning, example] if example and i < 2 else [meaning])
        if senses: words.setdefault(lemma, []).append([label, senses, int(f[5 + p_cnt])])

# Most common part of speech first (WordNet's own usage counts)
for w in words:
    words[w] = [p[:2] for p in sorted(words[w], key=lambda p: -p[2])]

# Common function words that WordNet leaves out.
FUNCTION = {
 'the': ('article', 'used before a noun to point to a specific person or thing'),
 'a': ('article', 'one; used before a singular noun when mentioning something for the first time'),
 'an': ('article', 'the form of "a" used before a vowel sound'),
 'and': ('conjunction', 'used to join words or ideas together'),
 'or': ('conjunction', 'used to show a choice or other possibility'),
 'but': ('conjunction', 'used to introduce something that contrasts with what was just said'),
 'nor': ('conjunction', 'and not; used after a negative to add another negative'),
 'yet': ('conjunction', 'but; even so'),
 'so': ('conjunction', 'for that reason; therefore'),
 'if': ('conjunction', 'on the condition that; in case'),
 'than': ('conjunction', 'used to compare two things'),
 'because': ('conjunction', 'for the reason that'),
 'although': ('conjunction', 'in spite of the fact that'),
 'though': ('conjunction', 'in spite of the fact that'),
 'while': ('conjunction', 'during the time that; whereas'),
 'whether': ('conjunction', 'used to introduce two or more possibilities'),
 'unless': ('conjunction', 'except if'),
 'until': ('conjunction', 'up to the time that'),
 'of': ('preposition', 'belonging to; coming from; made from; or about'),
 'to': ('preposition', 'in the direction of; toward; also used before a verb'),
 'in': ('preposition', 'inside something or within a place, time or state'),
 'on': ('preposition', 'resting upon or attached to a surface'),
 'at': ('preposition', 'in or near a particular place or time'),
 'by': ('preposition', 'near; through the action of; not later than'),
 'for': ('preposition', 'intended to benefit or be used by; because of; during'),
 'from': ('preposition', 'starting at a place, time or source'),
 'with': ('preposition', 'in the company of; using; having'),
 'without': ('preposition', 'not having; lacking'),
 'about': ('preposition', 'on the subject of; approximately'),
 'into': ('preposition', 'to the inside of; changing to'),
 'onto': ('preposition', 'to a position on top of'),
 'upon': ('preposition', 'on'),
 'over': ('preposition', 'above; across; more than'),
 'under': ('preposition', 'below; beneath; less than'),
 'between': ('preposition', 'in the space or time separating two things'),
 'among': ('preposition', 'surrounded by; in the middle of a group'),
 'through': ('preposition', 'going in one side and out the other; by means of'),
 'during': ('preposition', 'throughout the time of'),
 'before': ('preposition', 'earlier than; in front of'),
 'after': ('preposition', 'later than; following'),
 'against': ('preposition', 'opposed to; leaning on or touching'),
 'toward': ('preposition', 'in the direction of'),
 'towards': ('preposition', 'in the direction of'),
 'within': ('preposition', 'inside; not beyond'),
 'across': ('preposition', 'from one side to the other'),
 'behind': ('preposition', 'at the back of'),
 'beside': ('preposition', 'at the side of; next to'),
 'beyond': ('preposition', 'on the far side of; past'),
 'near': ('preposition', 'close to'),
 'like': ('preposition', 'similar to; in the same way as'),
 'as': ('conjunction', 'while; because; in the same way that; used in comparisons'),
 'i': ('pronoun', 'the word a speaker uses to refer to himself or herself'),
 'me': ('pronoun', 'the form of "I" used as an object'),
 'my': ('pronoun', 'belonging to me'),
 'mine': ('pronoun', 'the one that belongs to me'),
 'we': ('pronoun', 'the speaker and one or more other people'),
 'us': ('pronoun', 'the form of "we" used as an object'),
 'our': ('pronoun', 'belonging to us'),
 'ours': ('pronoun', 'the one that belongs to us'),
 'you': ('pronoun', 'the person or people being spoken to'),
 'your': ('pronoun', 'belonging to you'),
 'yours': ('pronoun', 'the one that belongs to you'),
 'he': ('pronoun', 'a male person or animal already mentioned'),
 'him': ('pronoun', 'the form of "he" used as an object'),
 'his': ('pronoun', 'belonging to him'),
 'she': ('pronoun', 'a female person or animal already mentioned'),
 'her': ('pronoun', 'the form of "she" used as an object; belonging to her'),
 'hers': ('pronoun', 'the one that belongs to her'),
 'it': ('pronoun', 'a thing, animal or idea already mentioned'),
 'its': ('pronoun', 'belonging to it'),
 'they': ('pronoun', 'people or things already mentioned'),
 'them': ('pronoun', 'the form of "they" used as an object'),
 'their': ('pronoun', 'belonging to them'),
 'theirs': ('pronoun', 'the one that belongs to them'),
 'myself': ('pronoun', 'me, used when I am both the doer and receiver of an action'),
 'himself': ('pronoun', 'him, used when he is both the doer and receiver of an action'),
 'herself': ('pronoun', 'her, used when she is both the doer and receiver of an action'),
 'itself': ('pronoun', 'it, used when it is both the doer and receiver of an action'),
 'themselves': ('pronoun', 'them, used when they are both the doers and receivers of an action'),
 'yourself': ('pronoun', 'you, used when you are both the doer and receiver of an action'),
 'ourselves': ('pronoun', 'us, used when we are both the doers and receivers of an action'),
 'this': ('determiner', 'the person or thing close by or just mentioned'),
 'that': ('determiner', 'the person or thing farther away or already mentioned'),
 'these': ('determiner', 'the plural of "this"'),
 'those': ('determiner', 'the plural of "that"'),
 'who': ('pronoun', 'which person or people; used to ask about or refer to people'),
 'whom': ('pronoun', 'the form of "who" used as an object'),
 'whose': ('pronoun', 'belonging to which person'),
 'which': ('pronoun', 'what one or ones out of a group'),
 'what': ('pronoun', 'used to ask about a thing or to refer to a thing'),
 'whatever': ('pronoun', 'anything or everything that'),
 'whoever': ('pronoun', 'any person who'),
 'each': ('determiner', 'every one of two or more, taken one at a time'),
 'every': ('determiner', 'all of the members of a group, without exception'),
 'some': ('determiner', 'an unspecified number or amount of'),
 'any': ('determiner', 'one or some, no matter which'),
 'no': ('determiner', 'not any'),
 'all': ('determiner', 'the whole number or amount of'),
 'both': ('determiner', 'the two together'),
 'either': ('determiner', 'one or the other of two'),
 'neither': ('determiner', 'not one and not the other of two'),
 'other': ('adjective', 'different or additional'),
 'such': ('determiner', 'of the kind mentioned'),
 'many': ('determiner', 'a large number of'),
 'much': ('determiner', 'a large amount of'),
 'few': ('determiner', 'a small number of'),
 'more': ('determiner', 'a greater number or amount'),
 'most': ('determiner', 'the greatest number or amount'),
 'is': ('verb', 'present form of "be", used with he, she or it'),
 'am': ('verb', 'present form of "be", used with I'),
 'are': ('verb', 'present form of "be", used with we, you or they'),
 'was': ('verb', 'past form of "be", used with I, he, she or it'),
 'were': ('verb', 'past form of "be", used with we, you or they'),
 'been': ('verb', 'past participle of "be"'),
 'being': ('verb', 'present participle of "be"'),
 'have': ('verb', 'to own or hold; also used to form perfect tenses'),
 'has': ('verb', 'form of "have" used with he, she or it'),
 'had': ('verb', 'past form of "have"'),
 'do': ('verb', 'to perform an action; also used to form questions and negatives'),
 'does': ('verb', 'form of "do" used with he, she or it'),
 'did': ('verb', 'past form of "do"'),
 'will': ('verb', 'used to talk about the future'),
 'would': ('verb', 'used for a possible or imagined event, or the future in the past'),
 'shall': ('verb', 'used to talk about the future, or to offer or suggest something'),
 'should': ('verb', 'used to say what is right or advisable'),
 'can': ('verb', 'to be able to'),
 'could': ('verb', 'was able to; or might be able to'),
 'may': ('verb', 'used to say something is possible or permitted'),
 'might': ('verb', 'used to say something is possible'),
 'must': ('verb', 'used to say something is necessary'),
 'not': ('adverb', 'used to make a word or statement negative'),
 'very': ('adverb', 'to a high degree; extremely'),
 'too': ('adverb', 'also; or more than is wanted'),
 'also': ('adverb', 'in addition; too'),
 'only': ('adverb', 'and no one or nothing more; just'),
 'just': ('adverb', 'exactly; only; a moment ago'),
 'then': ('adverb', 'at that time; after that'),
 'there': ('adverb', 'in or to that place'),
 'here': ('adverb', 'in or to this place'),
 'when': ('adverb', 'at what time; at the time that'),
 'where': ('adverb', 'in or to what place'),
 'why': ('adverb', 'for what reason'),
 'how': ('adverb', 'in what way; to what degree'),
 'now': ('adverb', 'at the present time'),
 'ever': ('adverb', 'at any time; always'),
 'never': ('adverb', 'at no time; not ever'),
 'again': ('adverb', 'once more'),
 'still': ('adverb', 'up to now or then; even so'),
 'already': ('adverb', 'before this time'),
 'perhaps': ('adverb', 'maybe; possibly'),
 'whom': ('pronoun', 'the form of "who" used as an object'),
 'thus': ('adverb', 'in this way; therefore'),
 'hence': ('adverb', 'for this reason; from this time'),
 'thence': ('adverb', 'from that place or time'),
 'whence': ('adverb', 'from what place or source'),
 'whilst': ('conjunction', 'while'),
 'amid': ('preposition', 'in the middle of'),
 'amongst': ('preposition', 'among'),
 'unto': ('preposition', 'to (old-fashioned)'),
 'thou': ('pronoun', 'you, singular (old-fashioned)'),
 'thee': ('pronoun', 'you, as an object, singular (old-fashioned)'),
 'thy': ('pronoun', 'your, singular (old-fashioned)'),
 'thine': ('pronoun', 'yours, singular (old-fashioned)'),
 'hath': ('verb', 'has (old-fashioned)'),
 'doth': ('verb', 'does (old-fashioned)'),
 'shalt': ('verb', 'shall, used with thou (old-fashioned)'),
 'wilt': ('verb', 'will, used with thou (old-fashioned)'),
 'ye': ('pronoun', 'you, plural (old-fashioned)'),
}
for w, (pos, meaning) in FUNCTION.items():
    entry = [pos, [[meaning]]]
    # keep WordNet senses too (e.g. "can", "will"), but put the function sense first
    words[w] = [entry] + [p for p in words.get(w, []) if p[0] != pos or w in ('can', 'will', 'may')]

# Irregular forms ("went" -> "go")
forms = {}
for name in POS:
    for line in (root / f'{name}.exc').read_text(encoding='utf-8').splitlines():
        f = line.split()
        if len(f) < 2 or not OK.fullmatch(f[0]): continue
        for base in f[1:]:
            if base in words and base != f[0] and base not in forms.setdefault(f[0], []):
                forms[f[0]].append(base)

out = pathlib.Path('public/dictionary')
for old in out.glob('*'): old.unlink()
out.mkdir(parents=True, exist_ok=True)
for letter in 'abcdefghijklmnopqrstuvwxyz':
    chunk = {w: d for w, d in sorted(words.items()) if w.startswith(letter)}
    (out / (letter + '.json')).write_text(json.dumps(chunk, ensure_ascii=False, separators=(',', ':')))
(out / 'forms.json').write_text(json.dumps(forms, separators=(',', ':')))
lic = (pathlib.Path(sys.argv[1]) / 'LICENSE').read_text(encoding='utf-8')
(out / 'LICENSE.txt').write_text('Princeton WordNet 3.0 - https://wordnet.princeton.edu/\n\n' + lic)
print(f'{len(words):,} words; {sum(p.stat().st_size for p in out.glob("*.json")):,} bytes')

/**
 * Emojis are saved as text codes, e.g. ":-)" for 😊, and shown as emojis again.
 * The database connection can't save emojis (4 bytes in UTF-8), they became "?".
 */
interface IEmojiCode {
  emoji: string;
  /** Saved in the database, also turns into the emoji when typed */
  code: string;
  /** Turns into the emoji when typed after a space or first in the text, never saved */
  aliases?: string[];
}

/** Also the emoji picker for comments, in this order: the most common ones, and some for orienteering */
export const emojiCodes: IEmojiCode[] = [
  { emoji: '😀', code: ':-D' },
  { emoji: '😂', code: ":'-D" },
  { emoji: '😊', code: ':-)', aliases: [':)'] },
  { emoji: '😉', code: ';-)', aliases: [';)'] },
  { emoji: '😍', code: ':heart_eyes:' },
  { emoji: '🥰', code: ':in_love:' },
  { emoji: '😎', code: 'B-)' },
  { emoji: '🤩', code: ':star_struck:' },
  { emoji: '😮', code: ':-O' },
  { emoji: '😛', code: ':-P' },
  { emoji: '😅', code: ':sweat_smile:' },
  { emoji: '🙁', code: ':-(', aliases: [':('] },
  { emoji: '😢', code: ":'-(" },
  { emoji: '😡', code: '>:-(' },
  { emoji: '🤔', code: ':thinking:' },
  { emoji: '👍', code: ':+1:' },
  { emoji: '👎', code: ':-1:' },
  { emoji: '👏', code: ':clap:' },
  { emoji: '🙌', code: ':raised_hands:' },
  { emoji: '💪', code: ':muscle:' },
  { emoji: '🙏', code: ':pray:' },
  { emoji: '❤️', code: '<3' },
  { emoji: '🔥', code: ':fire:' },
  { emoji: '🎉', code: ':tada:' },
  { emoji: '🏆', code: ':trophy:' },
  { emoji: '🥇', code: ':gold:' },
  { emoji: '🥈', code: ':silver:' },
  { emoji: '🥉', code: ':bronze:' },
  { emoji: '🏃', code: ':runner:' },
  { emoji: '🧭', code: ':compass:' },
  { emoji: '🗺️', code: ':map:' },
  { emoji: '🌲', code: ':tree:' },
  { emoji: '☀️', code: ':sun:' },
  { emoji: '🌧️', code: ':rain:' },
  { emoji: '❄️', code: ':snow:' }
];

const variationSelector = /️/g;
const withoutVariation = (emoji: string) => emoji.replace(variationSelector, '');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const longestFirst = (a: string, b: string) => b.length - a.length;
const alternatives = (texts: string[]) => [...texts].sort(longestFirst).map(escapeRegExp).join('|');

const codeByEmoji = new Map(emojiCodes.map(e => [withoutVariation(e.emoji), e.code]));
const emojiByCode = new Map(emojiCodes.map(e => [e.code, e.emoji]));
const emojiByAlias = new Map(emojiCodes.flatMap(e => (e.aliases ?? []).map(alias => [alias, e.emoji] as const)));

// A known emoji (with or without the variation selector), else any character outside the BMP (4 bytes in UTF-8)
const encodeRegExp = new RegExp(`(?:${alternatives([...codeByEmoji.keys()])})\\uFE0F?|[\\u{10000}-\\u{10FFFF}]`, 'gu');
// A known code, else the code of any other character ":u1f600:"
const decodeRegExp = new RegExp(`${alternatives([...emojiByCode.keys()])}|:u([0-9a-f]{5,6}):`, 'g');
const aliasRegExp = new RegExp(`(^|\\s)(${alternatives([...emojiByAlias.keys()])})`, 'g');

/** The text to save: emojis as codes, e.g. "Bra 😊" -> "Bra :-)" */
export const emojisToCodes = (text: string) =>
  text.replace(encodeRegExp, match => {
    const code = codeByEmoji.get(withoutVariation(match));
    return code ?? `:u${match.codePointAt(0)!.toString(16)}:`;
  });

/** The text to show: codes as emojis, e.g. "Bra :-)" -> "Bra 😊" */
export const codesToEmojis = (text: string) =>
  text.replace(decodeRegExp, (match, hex: string | undefined) => {
    if (!hex) return emojiByCode.get(match) ?? match;
    const codePoint = parseInt(hex, 16);
    return codePoint >= 0x10000 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
  });

/** While typing, also the short smileys without a nose, e.g. ":)" (only after a space, not in "kl:)") */
export const typedToEmojis = (text: string) =>
  codesToEmojis(text).replace(aliasRegExp, (_match, before: string, alias: string) => before + emojiByAlias.get(alias));

import { describe, expect, it } from 'vitest';
import { codesToEmojis, emojiCodes, emojisToCodes, typedToEmojis } from './emojiCodes';

// Characters outside the BMP are 4 bytes in UTF-8, the database connection can't save them
const hasFourByteCharacter = (text: string) => /[\u{10000}-\u{10FFFF}]/u.test(text);

describe('emojiCodes', () => {
  it('saves a happy face as :-)', () => {
    expect(emojisToCodes('Bra jobbat 😊')).toBe('Bra jobbat :-)');
    expect(codesToEmojis('Bra jobbat :-)')).toBe('Bra jobbat 😊');
  });

  it('gets every emoji in the list back', () => {
    emojiCodes.forEach(({ emoji, code }) => {
      expect(emojisToCodes(emoji)).toBe(code);
      expect(codesToEmojis(code)).toBe(emoji);
    });
  });

  it('saves an emoji with or without the variation selector', () => {
    expect(emojisToCodes('❤')).toBe('<3');
    expect(emojisToCodes('❤️')).toBe('<3');
    expect(emojisToCodes('🗺')).toBe(':map:');
  });

  it('saves other emojis as their code point and gets them back', () => {
    const text = 'Hej 🦊 och 👍🏽 och 👨‍👩‍👧 och 𠜎';
    const saved = emojisToCodes(text);
    expect(saved).toBe('Hej :u1f98a: och :+1::u1f3fd: och :u1f468:‍:u1f469:‍:u1f467: och :u2070e:');
    expect(hasFourByteCharacter(saved)).toBe(false);
    expect(codesToEmojis(saved)).toBe(text);
  });

  it('keeps the text without emojis and Swedish letters', () => {
    const text = 'Åsa, Örjan och Ärla springer kl 10:00 (se länk)';
    expect(emojisToCodes(text)).toBe(text);
    expect(codesToEmojis(text)).toBe(text);
  });

  it('keeps an invalid code point code', () => {
    expect(codesToEmojis(':uffff: :u110000:')).toBe(':uffff: :u110000:');
  });

  it('turns the short smileys into emojis only when typed after a space', () => {
    expect(typedToEmojis(':) bra ;) och :(')).toBe('😊 bra 😉 och 🙁');
    expect(typedToEmojis('kl:) (se:)')).toBe('kl:) (se:)');
    expect(typedToEmojis('hej:-)')).toBe('hej😊');
    // The short ones are never saved, the emoji is saved as the code
    expect(emojisToCodes(typedToEmojis('hej :)'))).toBe('hej :-)');
  });
});

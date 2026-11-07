import { describe, expect, it } from 'vitest';
import { GetCourseLengths } from './resultHelper';

describe('GetCourseLengths', () => {
  it('reads the course of each class, by id and name, from the start list as the proxy converts it', () => {
    const startList = {
      '@attributes': { iofVersion: '3.0' },
      ClassStart: [
        { Class: { Id: '101', Name: 'H21' }, Course: { Name: 'Bana 1', Length: '9850' } },
        // A forked class without a course of its own, the course of the first starter is used
        {
          Class: { Id: '102', Name: 'D21' },
          PersonStart: [{ Start: { Course: { Length: '7300' } } }, { Start: { Course: { Length: '7350' } } }]
        },
        { Class: { Id: '103', Name: 'Inskolning' } }
      ]
    };
    const lengths = GetCourseLengths(startList);
    expect(lengths.get('101')).toBe(9850);
    expect(lengths.get('H21')).toBe(9850);
    expect(lengths.get('102')).toBe(7300);
    expect(lengths.has('103')).toBe(false);
  });

  it('reads a single class, and nothing from an empty answer', () => {
    expect(
      GetCourseLengths({ ClassStart: { Class: { Id: '1', Name: 'H10' }, Course: [{ Length: 2100 }] } }).get('H10')
    ).toBe(2100);
    expect(GetCourseLengths(undefined).size).toBe(0);
  });
});

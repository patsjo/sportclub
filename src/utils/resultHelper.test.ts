import { describe, expect, it } from 'vitest';
import { IEventorEntryFee } from './responseEventorInterfaces';
import { GetCourseLengths, GetFees } from './resultHelper';

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

describe('GetFees', () => {
  const fee = (
    id: string,
    amount: string,
    extra: Partial<IEventorEntryFee> = {},
    attributes: Partial<IEventorEntryFee['@attributes']> = {}
  ): IEventorEntryFee =>
    ({
      EntryFeeId: id,
      '@attributes': { entryFeeType: 'adult', type: 'adult', ...attributes },
      Amount: amount,
      ExternalFee: '0',
      Name: id,
      ...extra
    }) as IEventorEntryFee;
  const lateFrom = { ValidFromDate: { Date: '2026-03-11', Clock: '20:01:00' } };
  const deadline = { ValidToDate: { Date: '2026-03-11', Clock: '20:00:59' } };
  const adult = { ToDateOfBirth: { Date: '2009-12-31' } };
  const youth = { FromDateOfBirth: { Date: '2010-01-01' } };
  // An open class with adult and youth fees, as in Eventor
  const entryFees = [
    fee('227193', '270', { ...lateFrom, ...adult }),
    fee('227197', '50', {}, { valueOperator: 'percent', taxIncluded: 'N' }),
    fee('227194', '140', { ...lateFrom, ...youth }, { entryFeeType: 'youth', type: 'youth' }),
    fee('227195', '180', { ...deadline, ...adult }),
    fee('227196', '95', { ...deadline, ...youth }, { entryFeeType: 'youth', type: 'youth' })
  ];
  const ordinaryIds = ['227193', '227194', '227195', '227196'];

  it('picks the adult or youth fee by the birthday of the competitor', () => {
    expect(GetFees(entryFees, ordinaryIds, '1975-06-01')).toEqual({ originalFee: 180, lateFee: 270 });
    expect(GetFees(entryFees, ordinaryIds, '2009-12-31')).toEqual({ originalFee: 180, lateFee: 270 });
    expect(GetFees(entryFees, ordinaryIds, '2010-01-01')).toEqual({ originalFee: 95, lateFee: 140 });
    expect(GetFees(entryFees, ordinaryIds, '2014-05-20')).toEqual({ originalFee: 95, lateFee: 140 });
  });

  it('adds the percentage to the ordinary fee of the age bracket', () => {
    expect(GetFees(entryFees, ['227195', '227196', '227197'], '2012-01-01')).toEqual({
      originalFee: 95,
      lateFee: 47.5
    });
  });

  it('assumes the adult fee when the birthday is unknown', () => {
    expect(GetFees(entryFees, ['227195', '227196'], '')).toEqual({ originalFee: 180, lateFee: 0 });
  });

  it('never counts a percentage as the ordinary fee', () => {
    expect(GetFees(entryFees, ['227196', '227197'], '1975-06-01')).toEqual({ originalFee: 0, lateFee: 0 });
  });

  it('uses all fees without age limits', () => {
    expect(GetFees([fee('1', '120'), fee('2', '20')], ['1', '2'], '1990-01-01')).toEqual({
      originalFee: 140,
      lateFee: 0
    });
  });
});

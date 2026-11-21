import { describe, expect, it } from 'vitest';
import {
  IRaceClassClassificationProps,
  IRaceClassLevelProps,
  IRaceEventClassificationProps
} from '../models/resultModel';
import { ClassTypeShortName, DifficultyTypes, EventClassificationIdTypes } from './resultConstants';
import {
  GetClassClassificationIdForClass,
  GetDeviantEventClassificationIdForClass,
  GetLowerFinalClassTypeShortName
} from './resultHelper';

let nextId = 1;
const cc = (
  description: string,
  classTypeShortName: ClassTypeShortName,
  limits: { ageUpperLimit?: number; ageLowerLimit?: number } = {}
) =>
  ({
    classClassificationId: nextId++,
    description,
    classTypeShortName,
    ageUpperLimit: limits.ageUpperLimit ?? null,
    ageLowerLimit: limits.ageLowerLimit ?? null,
    decreaseBasePoint: 0,
    decreaseBase1000Point: 0,
    decreaseOldBasePoint: 0
  }) as unknown as IRaceClassClassificationProps;

const ec = (eventClassificationId: EventClassificationIdTypes, classClassifications: IRaceClassClassificationProps[]) =>
  ({ eventClassificationId, classClassifications }) as unknown as IRaceEventClassificationProps;

const eventClassifications = [
  ec('B', [
    cc('Senior', 'E'),
    cc('Veteran', 'T', { ageLowerLimit: 35 }),
    cc('Junior', 'E', { ageUpperLimit: 20 }),
    cc('Ungdom', 'T', { ageUpperLimit: 16 })
  ]),
  ec('E', [
    cc('Huvudklass', 'T'),
    cc('Ej högsta huvudklass', 'S'),
    cc('Motion/Lätt', 'M'),
    cc('Inskolning', 'I'),
    cc('Öppen bana', 'Ö')
  ]),
  ec('F', [
    cc('Elit', 'E'),
    cc('Huvudklass', 'T'),
    cc('Ej högsta huvudklass', 'S'),
    cc('Motion/Lätt', 'M'),
    cc('Inskolning', 'I'),
    cc('Öppen bana', 'Ö')
  ])
];

const level = (
  classShortName: string,
  classTypeShortName: ClassTypeShortName,
  age: number,
  difficulty: DifficultyTypes = 'Svart'
): IRaceClassLevelProps => ({
  classShortName,
  classTypeShortName,
  age,
  difficulty
});
const classLevels = [
  level('H21', 'T', 21),
  level('M21', 'T', 21),
  level('D21', 'T', 21),
  level('H21E', 'E', 21),
  level('H21K', 'S', 21),
  level('H20', 'T', 20),
  level('D20', 'T', 20),
  level('D20E', 'E', 20),
  level('H18', 'T', 18),
  level('D18', 'T', 18),
  level('H16', 'T', 16),
  level('H45', 'T', 45),
  level('H21M', 'M', 21, 'Röd'),
  level('INSK', 'I', 16, 'Grön'),
  level('Ö5', 'Ö', 21, 'Orange'),
  level('Ö7', 'Ö', 21, 'Blå')
];

const description = (eventClassificationId: EventClassificationIdTypes, className: string) => {
  const id = GetClassClassificationIdForClass(eventClassificationId, className, classLevels, eventClassifications);
  return eventClassifications
    .find(e => e.eventClassificationId === eventClassificationId)
    ?.classClassifications.find(c => c.classClassificationId === id)?.description;
};

describe('GetClassClassificationIdForClass', () => {
  it.each([
    ['D21A', 'Senior'],
    ['H21', 'Senior'],
    ['D20A', 'Junior'],
    ['H20A', 'Junior'],
    ['D18A', 'Junior'],
    ['H18A', 'Junior'],
    ['D20E', 'Junior'],
    ['H16', 'Ungdom'],
    ['H45', 'Veteran']
  ])('%s in SM is %s', (className, expected) => {
    expect(description('B', className)).toBe(expected);
  });

  it.each([
    ['H21B', 'Huvudklass'],
    ['H20B', 'Huvudklass'],
    ['H21C', 'Ej högsta huvudklass'],
    ['M21-D', 'Ej högsta huvudklass'],
    ['H21 F', 'Ej högsta huvudklass']
  ])('%s in SM(b-final) is %s', (className, expected) => {
    expect(description('E', className)).toBe(expected);
  });

  it('keeps national event classifications', () => {
    expect(description('F', 'H21E')).toBe('Elit');
    expect(description('F', 'H21')).toBe('Huvudklass');
    expect(description('F', 'H21K')).toBe('Ej högsta huvudklass');
  });
});

describe('lower finals', () => {
  it.each(['H21', 'M21', 'H21A', 'M21A', 'H21-A', 'M21-A', 'H21 Elit', 'H20', 'D16'])(
    '%s is not a lower final',
    className => {
      expect(GetLowerFinalClassTypeShortName(className)).toBeNull();
      expect(GetDeviantEventClassificationIdForClass('B', className, classLevels)).toBeNull();
    }
  );

  it.each(['H21K', 'H21L', 'H21M', 'Öppen 5'])('%s is not a lower final', className => {
    expect(GetLowerFinalClassTypeShortName(className)).toBeNull();
  });

  it.each([
    ['H21B', 'T'],
    ['H21-B', 'T'],
    ['H20B', 'T'],
    ['H21C', 'S'],
    ['D21D', 'S'],
    ['H21E', 'S'],
    ['H21F', 'S']
  ])('%s is a lower final of type %s', (className, expected) => {
    expect(GetLowerFinalClassTypeShortName(className)).toBe(expected);
    expect(GetDeviantEventClassificationIdForClass('B', className, classLevels)).toBe('E');
  });

  it('only deviates in championships', () => {
    expect(GetDeviantEventClassificationIdForClass('F', 'H21B', classLevels)).toBeNull();
    expect(GetDeviantEventClassificationIdForClass('A', 'H21B', classLevels)).toBe('E');
  });
});

describe('non championship classes in championships', () => {
  it.each([
    ['Blå 3,0', 'Öppen bana'],
    ['Öppen 5', 'Öppen bana'],
    ['Inskolning', 'Inskolning'],
    ['H21M', 'Motion/Lätt'],
    ['H21K', 'Ej högsta huvudklass']
  ])('%s gets Nationell tävling and %s', (className, expected) => {
    const deviant = GetDeviantEventClassificationIdForClass('B', className, classLevels);
    expect(deviant).toBe('F');
    expect(description(deviant!, className)).toBe(expected);
  });

  it('keeps open classes in national events', () => {
    expect(GetDeviantEventClassificationIdForClass('F', 'Blå 3,0', classLevels)).toBeNull();
  });
});

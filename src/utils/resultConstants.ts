import { TFunction } from 'i18next';
import { IOption } from './formHelper';

export type AwardTypes = 'G' | 'S' | 'B' | 'UM' | 'UE' | 'UG' | 'US' | 'UB' | 'UJ';
export type DistanceTypes = 'Sprint' | 'Middle' | 'Long' | 'UltraLong';
export type DifficultyTypes = 'Grön' | 'Vit' | 'Gul' | 'Orange' | 'Röd' | 'Lila' | 'Blå' | 'Svart';
export type EventClassificationIdTypes = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
export type FailedReasonTypes = 'EJ START' | 'UTGÅTT' | 'FULLFÖ' | 'GODK';
export type LightConditionTypes = 'Day' | 'Night' | 'Dusk' | 'Dawn';
export type PaymentTypes = 0 | 1 | 2 | 3 | 4;
export type SportCodeTypes = 'OL' | 'RUN' | 'MTB' | 'MTBO' | 'SKI' | 'SKIO' | 'INOL' | 'PREO';
export type ClassTypeShortName = 'I' | 'E' | 'T' | 'S' | 'M' | 'Ö';

export const ManuallyEditedMissingTimePostfix = '.0001';

export const difficulties: Record<string, DifficultyTypes> = {
  green: 'Grön',
  white: 'Vit',
  yellow: 'Gul',
  orange: 'Orange',
  red: 'Röd',
  purple: 'Lila',
  blue: 'Blå',
  black: 'Svart',
};

export const difficultiesArray: DifficultyTypes[] = ['Grön', 'Vit', 'Gul', 'Orange', 'Röd', 'Lila', 'Blå', 'Svart'];

export const failedReasons: Record<string, FailedReasonTypes> = {
  NotStarted: 'EJ START',
  NotFinished: 'UTGÅTT',
  Finished: 'FULLFÖ',
  Approved: 'GODK',
};

export const failedReasonOptions = (t: TFunction): IOption[] => [
  { code: failedReasons.NotStarted, description: t('results.NotStarted') },
  { code: failedReasons.NotFinished, description: t('results.NotFinished') },
  { code: failedReasons.Finished, description: t('results.Finished') },
];

export type GenderType = 'MALE' | 'FEMALE';

export const genders: Record<string, GenderType> = {
  FeMale: 'FEMALE',
  Male: 'MALE',
};

export const genderOptions = (t: TFunction): IOption[] => [
  { code: genders.FeMale, description: t('results.FeMale') },
  { code: genders.Male, description: t('results.Male') },
];

export type PaymentModelTypes = 0 | 1 | 2 | 3 | 4;

export const payments: Record<string, PaymentModelTypes> = {
  defaultFee0And100IfNotStarted: 0,
  defaultFee0And100IfNotFinished: 1,
  defaultFee50And100IfNotFinished: 2,
  defaultFeePaidByCompetitor: 3,
  defaultFee50And100IfNotStarted: 4,
};

export const paymentOptions = (t: TFunction): IOption[] => [
  { code: payments.defaultFee0And100IfNotStarted, description: t('results.DefaultFee0And100IfNotStarted') },
  { code: payments.defaultFee0And100IfNotFinished, description: t('results.DefaultFee0And100IfNotFinished') },
  { code: payments.defaultFee50And100IfNotStarted, description: t('results.DefaultFee50And100IfNotStarted') },
  { code: payments.defaultFee50And100IfNotFinished, description: t('results.DefaultFee50And100IfNotFinished') },
  { code: payments.defaultFeePaidByCompetitor, description: t('results.DefaultFeePaidByCompetitor') },
];

export const lightConditions: Record<string, LightConditionTypes> = {
  day: 'Day',
  night: 'Night',
  dusk: 'Dusk',
  dawn: 'Dawn',
};

export const raceLightConditionOptions = (t: TFunction): IOption[] => [
  { code: lightConditions.day, description: t('results.Day') },
  { code: lightConditions.night, description: t('results.Night') },
  { code: lightConditions.dusk, description: t('results.Dusk') },
  { code: lightConditions.dawn, description: t('results.Dawn') },
];

export const distances: Record<string, DistanceTypes> = {
  sprint: 'Sprint',
  middle: 'Middle',
  long: 'Long',
  ultraLong: 'UltraLong',
};

export const raceDistanceOptions = (t: TFunction): IOption[] => [
  { code: distances.sprint, description: t('results.Sprint') },
  { code: distances.middle, description: t('results.Middle') },
  { code: distances.long, description: t('results.Long') },
  { code: distances.ultraLong, description: t('results.UltraLong') },
];

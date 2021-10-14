import { GenderType } from './resultConstants';

export interface ICompetitorInfo {
  competitorId: number;
  seniorAchievements: string;
  juniorAchievements: string;
  youthAchievements: string;
  thumbnail: string;
}

export interface ICompetitor {
  competitorId: number;
  birthYear: number;
  gender: GenderType;
  name: string;
  ranking: number;
}

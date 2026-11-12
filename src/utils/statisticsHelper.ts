import type { IEventLocation, IMedalListItem } from '../components/charts/ChartInterface';

/** Position limits tried in order until the list contains at least MinMedalListItems rows. */
export const MedalListPositionLimits = [3, 6, 10, 15, 20, 25, 30];
export const MinMedalListItems = 3;

export interface IMedalListSelection {
  positionLimit: number;
  items: IMedalListItem[];
}

/**
 * Picks the placings to show.
 * A selected year shows every placing in top 30.
 * All years (year undefined) shows medals (1-3); if that gives fewer than three rows the limit widens to
 * top 6, 10, 15, 20, 25 and 30.
 * Sorted by position, then latest race first.
 */
export const GetMedalListSelection = (medals: IMedalListItem[], year?: number): IMedalListSelection => {
  const inYear = year === undefined ? medals : medals.filter(m => m.year === year);
  let positionLimit = MedalListPositionLimits[0];
  let items: IMedalListItem[] = [];

  const limits = year === undefined ? MedalListPositionLimits : MedalListPositionLimits.slice(-1);

  for (const limit of limits) {
    positionLimit = limit;
    items = inYear.filter(m => m.position <= limit);
    if (items.length >= MinMedalListItems) break;
  }

  return {
    positionLimit,
    items: [...items].sort(
      (a, b) => a.position - b.position || b.raceDate.localeCompare(a.raceDate) || a.key.localeCompare(b.key)
    )
  };
};

export const HasCoordinates = (
  location: IEventLocation
): location is IEventLocation & { longitude: number; latitude: number } =>
  location.longitude !== null &&
  location.latitude !== null &&
  !(location.longitude === 0 && location.latitude === 0) &&
  Math.abs(location.latitude) <= 90 &&
  Math.abs(location.longitude) <= 180;

/** Distinct years, latest first. */
export const GetYears = (items: { year: number }[]): number[] =>
  [...new Set(items.map(i => i.year))].sort((a, b) => b - a);

import fs from 'fs';
import { getDistance } from 'ol/sphere';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ILineStringGeometry } from '../models/graphic';
import { averageOverlappingSegments, snapToExistingPath } from './gpxUtils';

type Point = ILineStringGeometry['path'][number];

/** Pulls the track points out of a GPX document. */
const parseTrackPoints = (content: string): Point[] => {
  const points: Point[] = [];
  const regex = /<trkpt lat="([^"]+)" lon="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    points.push({ latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) });
  }
  return points;
};

const pathDistance = (path: Point[]): number => {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += getDistance([path[i].longitude, path[i].latitude], [path[i + 1].longitude, path[i + 1].latitude]);
  }
  return total;
};

const countConsecutiveDuplicates = (path: Point[]): number => {
  let count = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].latitude === path[i + 1].latitude && path[i].longitude === path[i + 1].longitude) count++;
  }
  return count;
};

const samePoint = (a: Point, b: Point): boolean => a.latitude === b.latitude && a.longitude === b.longitude;

// Synthetic paths are expressed as metre offsets from a point inside the
// fixture's area, so the projected tolerances behave the same as in real use.
const ORIGIN: Point = { latitude: 56.2327, longitude: 15.6566 };
const METRES_PER_DEGREE_LATITUDE = 111320;
const metresPerDegreeLongitude = METRES_PER_DEGREE_LATITUDE * Math.cos((ORIGIN.latitude * Math.PI) / 180);

const offsetPoint = (eastMetres: number, northMetres: number): Point => ({
  latitude: ORIGIN.latitude + northMetres / METRES_PER_DEGREE_LATITUDE,
  longitude: ORIGIN.longitude + eastMetres / metresPerDegreeLongitude
});

const straightLineEast = (points: number, spacingMetres: number, northMetres: number): Point[] =>
  Array.from({ length: points }, (_, i) => offsetPoint(i * spacingMetres, northMetres));

// A real 12.3 km track that doubles back on itself for its first and last
// ~2.9 km, which is what makes it useful for exercising the overlap merging.
const fixturePath = parseTrackPoints(fs.readFileSync(path.join(process.cwd(), 'src', 'utils', 'gpxTest.gpx'), 'utf-8'));
const OVERLAPPING_VERTICES = 185;
const TOLERANCES = [20, 30];

describe('averageOverlappingSegments', () => {
  it('reads the fixture track', () => {
    expect(fixturePath).toHaveLength(682);
    expect(countConsecutiveDuplicates(fixturePath)).toBe(0);
    expect(pathDistance(fixturePath) / 1000).toBeCloseTo(12.32, 2);
  });

  it.each(TOLERANCES)('preserves the overall length of the fixture (tolerance %im)', tolerance => {
    const merged = averageOverlappingSegments(fixturePath, tolerance, 80);

    // Averaging the two legs onto a centre line only shifts vertices sideways,
    // so the length must stay within a few tens of metres of the original.
    expect(Math.abs(pathDistance(merged) - pathDistance(fixturePath))).toBeLessThan(100);
  });

  it.each(TOLERANCES)('gives both legs of the out-and-back identical vertices (tolerance %im)', tolerance => {
    const merged = averageOverlappingSegments(fixturePath, tolerance, 80);
    const outbound = merged.slice(0, OVERLAPPING_VERTICES);
    const returnLeg = merged.slice(merged.length - OVERLAPPING_VERTICES).reverse();

    expect(outbound).toEqual(returnLeg);
  });

  it.each(TOLERANCES)('introduces no duplicate consecutive vertices (tolerance %im)', tolerance => {
    expect(countConsecutiveDuplicates(averageOverlappingSegments(fixturePath, tolerance, 80))).toBe(0);
  });

  it('leaves a path that never doubles back untouched', () => {
    const straight = straightLineEast(21, 50, 0);
    const result = averageOverlappingSegments(straight, 20, 80);

    expect(result).toHaveLength(straight.length);
    result.forEach((point, i) => {
      expect(point.latitude).toBeCloseTo(straight[i].latitude, 9);
      expect(point.longitude).toBeCloseTo(straight[i].longitude, 9);
    });
  });

  it('returns a copy of a path too short to overlap', () => {
    const single = [offsetPoint(0, 0)];
    const result = averageOverlappingSegments(single);

    expect(result).toEqual(single);
    expect(result).not.toBe(single);
  });
});

describe('snapToExistingPath', () => {
  const existingPath = straightLineEast(21, 50, 0);

  it('adopts the existing vertices where the paths run together, and keeps the rest', () => {
    // 600 m running 5 m off the existing line, then a tail heading away from it.
    const alongside = straightLineEast(13, 50, 5);
    const diverging = [offsetPoint(650, 60), offsetPoint(700, 160), offsetPoint(750, 260)];

    const snapped = snapToExistingPath([...alongside, ...diverging], existingPath, 20, 80);

    // The near-parallel vertices are replaced by the existing path's own.
    expect(snapped.some(point => alongside.some(original => samePoint(original, point)))).toBe(false);
    expect(snapped.filter(point => existingPath.some(existing => samePoint(existing, point)))).toHaveLength(13);
    // The section that runs away from the existing path survives unchanged.
    expect(snapped.slice(-diverging.length)).toEqual(diverging);
  });

  it('leaves a path that runs far from the existing one untouched', () => {
    const faraway = straightLineEast(13, 50, 5000);

    expect(snapToExistingPath(faraway, existingPath, 20, 80)).toEqual(faraway);
  });

  it('ignores an overlap shorter than the minimum', () => {
    // Only 100 m alongside the existing path, below a 200 m minimum.
    const brieflyAlongside = straightLineEast(3, 50, 5);

    expect(snapToExistingPath(brieflyAlongside, existingPath, 20, 200)).toEqual(brieflyAlongside);
  });

  it('returns a copy when either path is too short to match', () => {
    const single = [offsetPoint(0, 0)];

    expect(snapToExistingPath(single, existingPath)).toEqual(single);
    expect(snapToExistingPath(existingPath, single)).toEqual(existingPath);
  });
});

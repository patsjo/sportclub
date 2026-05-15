import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getDistance } from 'ol/sphere';
import { ILineStringGeometry } from '../models/graphic';

const areEqual = (a: ILineStringGeometry['path'][number], b: ILineStringGeometry['path'][number]): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude;

const getClosestDistanceToLine = (point: Coordinate, lineStart: Coordinate, lineEnd: Coordinate): number => {
  const line = new LineString([lineStart, lineEnd]);
  const closestPoint = line.getClosestPoint(point);
  return getDistance(point, closestPoint);
};

const reducePointsPreCalculation = (
  points: Coordinate[],
  epsilon: number,
  start: number,
  end: number,
  keep: boolean[]
): void => {
  if (end <= start + 2) return;

  for (let i = start + 2; i < end; i++) {
    const distances = points.slice(start + 1, i - 1).map(p => getClosestDistanceToLine(p, points[start], points[i]));
    const maxDistance = Math.max(...distances);
    if (maxDistance > epsilon) {
      keep[i - 1] = true;
      reducePointsPreCalculation(points, epsilon, i - 1, end, keep);
      break;
    }
  }
};

const reducePoints = (
  points: ILineStringGeometry['path'],
  toleranceMeters: number = 1
): ILineStringGeometry['path'] => {
  if (points.length <= 2) return [...points];

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const projectedPoints = points.map(p => fromLonLat([p.longitude, p.latitude]));

  reducePointsPreCalculation(projectedPoints, toleranceMeters, 0, points.length - 1, keep);

  return points.filter((_, i) => keep[i]);
};

/**
 * Detects portions of the path that run within `toleranceMeters` of a
 * distant part of the same path for at least `minOverlapMeters`, then
 * averages the reference leg to a centre-line and replaces the partner
 * leg's vertices with the same coordinates (reversed), so both legs
 * share identical vertex positions.
 */
export const averageOverlappingSegments = (
  path: ILineStringGeometry['path'],
  toleranceMeters: number = 20,
  minOverlapMeters: number = 80
): ILineStringGeometry['path'] => {
  if (path.length < 2) return [...path];

  const proj = path.map(p => fromLonLat([p.longitude, p.latitude]));
  const n = proj.length;

  // EPSG:3857 inflates distances by 1/cos(lat). Scale thresholds to match.
  const meanLat = path.reduce((s, p) => s + p.latitude, 0) / n;
  const mercScale = 1 / Math.cos(meanLat * (Math.PI / 180));

  const projTolerance = toleranceMeters * mercScale;
  const projMinOverlap = minOverlapMeters * mercScale;

  const euclid = (a: Coordinate, b: Coordinate) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const cumDist: number[] = new Array(n);
  cumDist[0] = 0;
  for (let i = 1; i < n; i++) {
    cumDist[i] = cumDist[i - 1] + euclid(proj[i - 1], proj[i]);
  }

  const totalLen = cumDist[n - 1];
  const minPathGap = Math.min(Math.max(projMinOverlap * 3, 500 * mercScale), totalLen / 3);

  const closestPointOnSeg = (p: Coordinate, a: Coordinate, b: Coordinate): Coordinate => {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const wx = p[0] - a[0];
    const wy = p[1] - a[1];
    const len2 = vx * vx + vy * vy;
    let t = 0;
    if (len2 > 0) t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
    return [a[0] + t * vx, a[1] + t * vy] as Coordinate;
  };

  type Match = { closest: Coordinate; dist: number; segIdx: number };
  const matches: (Match | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    let bestDist = Infinity;
    let bestClosest: Coordinate | null = null;
    let bestSegIdx = -1;

    for (let j = 0; j + 1 < n; j++) {
      const gapToSeg = Math.min(Math.abs(cumDist[i] - cumDist[j]), Math.abs(cumDist[i] - cumDist[j + 1]));
      if (gapToSeg < minPathGap) continue;

      const closest = closestPointOnSeg(proj[i], proj[j], proj[j + 1]);
      const dist = euclid(proj[i], closest);

      if (dist < bestDist) {
        bestDist = dist;
        bestClosest = closest;
        bestSegIdx = j;
      }
    }

    if (bestClosest && bestDist <= projTolerance) {
      matches[i] = { closest: bestClosest, dist: bestDist, segIdx: bestSegIdx };
    }
  }

  // --- Identify qualifying runs ---
  type Run = { start: number; end: number };
  const runs: Run[] = [];
  let idx = 0;
  while (idx < n) {
    if (!matches[idx]) {
      idx++;
      continue;
    }
    const start = idx;
    while (idx < n && matches[idx]) idx++;
    const end = idx - 1;

    let runLen = 0;
    for (let k = start; k < end; k++) runLen += euclid(proj[k], proj[k + 1]);
    if (runLen >= projMinOverlap) runs.push({ start, end });
  }

  // --- Pair runs whose matched segments fall inside each other ---
  const paired = new Set<number>();
  const pairs: { ref: Run; follower: Run }[] = [];

  for (let a = 0; a < runs.length; a++) {
    if (paired.has(a)) continue;
    const runA = runs[a];
    const aSeg = matches[runA.start]!.segIdx;

    for (let b = a + 1; b < runs.length; b++) {
      if (paired.has(b)) continue;
      const runB = runs[b];

      if (aSeg >= runB.start && aSeg <= runB.end) {
        paired.add(a);
        paired.add(b);
        const aCount = runA.end - runA.start + 1;
        const bCount = runB.end - runB.start + 1;
        if (aCount >= bCount) {
          pairs.push({ ref: runA, follower: runB });
        } else {
          pairs.push({ ref: runB, follower: runA });
        }
        break;
      }
    }
  }

  // --- Average reference runs to midpoints ---
  const newProj = proj.map(p => [...p] as Coordinate);

  for (const { ref } of pairs) {
    for (let k = ref.start; k <= ref.end; k++) {
      const m = matches[k]!;
      newProj[k] = [(proj[k][0] + m.closest[0]) / 2, (proj[k][1] + m.closest[1]) / 2] as Coordinate;
    }
  }

  // Also average any unpaired runs normally
  for (let r = 0; r < runs.length; r++) {
    if (paired.has(r)) continue;
    for (let k = runs[r].start; k <= runs[r].end; k++) {
      const m = matches[k]!;
      newProj[k] = [(proj[k][0] + m.closest[0]) / 2, (proj[k][1] + m.closest[1]) / 2] as Coordinate;
    }
  }

  // --- Replace each follower run with the reference's vertices (reversed) ---
  pairs.sort((a, b) => a.follower.start - b.follower.start);

  const result: Coordinate[] = [];
  let cursor = 0;

  for (const { ref, follower } of pairs) {
    for (let i = cursor; i < follower.start; i++) result.push(newProj[i]);

    const fFirst = newProj[follower.start];
    const reversed = euclid(fFirst, newProj[ref.end]) < euclid(fFirst, newProj[ref.start]);

    if (reversed) {
      for (let i = ref.end; i >= ref.start; i--) result.push(newProj[i]);
    } else {
      for (let i = ref.start; i <= ref.end; i++) result.push(newProj[i]);
    }

    cursor = follower.end + 1;
  }

  for (let i = cursor; i < n; i++) result.push(newProj[i]);

  return result.map(p => {
    const [lon, lat] = toLonLat(p);
    return { latitude: lat, longitude: lon };
  });
};

/**
 * Snaps portions of `path` onto `existingPath` where they run within
 * `toleranceMeters` for at least `minOverlapMeters`.  Matched sections
 * are replaced with the existing path's actual vertices (preserving
 * direction), so the two paths share identical coordinates.
 */
export const snapToExistingPath = (
  path: ILineStringGeometry['path'],
  existingPath: ILineStringGeometry['path'],
  toleranceMeters: number = 20,
  minOverlapMeters: number = 80
): ILineStringGeometry['path'] => {
  if (path.length < 2 || existingPath.length < 2) return [...path];

  const proj = path.map(p => fromLonLat([p.longitude, p.latitude]));
  const existProj = existingPath.map(p => fromLonLat([p.longitude, p.latitude]));
  const n = proj.length;
  const en = existProj.length;

  const meanLat =
    (path.reduce((s, p) => s + p.latitude, 0) + existingPath.reduce((s, p) => s + p.latitude, 0)) / (n + en);
  const mercScale = 1 / Math.cos(meanLat * (Math.PI / 180));
  const projTolerance = toleranceMeters * mercScale;
  const projMinOverlap = minOverlapMeters * mercScale;

  const euclid = (a: Coordinate, b: Coordinate) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const closestPointOnSeg = (p: Coordinate, a: Coordinate, b: Coordinate): Coordinate => {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const wx = p[0] - a[0];
    const wy = p[1] - a[1];
    const len2 = vx * vx + vy * vy;
    let t = 0;
    if (len2 > 0) t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
    return [a[0] + t * vx, a[1] + t * vy] as Coordinate;
  };

  type Match = { segIdx: number; dist: number };
  const matches: (Match | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    let bestDist = Infinity;
    let bestSegIdx = -1;

    for (let j = 0; j + 1 < en; j++) {
      const closest = closestPointOnSeg(proj[i], existProj[j], existProj[j + 1]);
      const dist = euclid(proj[i], closest);

      if (dist < bestDist) {
        bestDist = dist;
        bestSegIdx = j;
      }
    }

    if (bestDist <= projTolerance) {
      matches[i] = { segIdx: bestSegIdx, dist: bestDist };
    }
  }

  type Run = { start: number; end: number };
  const runs: Run[] = [];
  let idx = 0;
  while (idx < n) {
    if (!matches[idx]) {
      idx++;
      continue;
    }
    const start = idx;
    while (idx < n && matches[idx]) idx++;
    const end = idx - 1;

    let runLen = 0;
    for (let k = start; k < end; k++) runLen += euclid(proj[k], proj[k + 1]);
    if (runLen >= projMinOverlap) runs.push({ start, end });
  }

  runs.sort((a, b) => a.start - b.start);

  const result: ILineStringGeometry['path'] = [];
  let cursor = 0;

  for (const run of runs) {
    for (let i = cursor; i < run.start; i++) result.push(path[i]);

    const startSeg = matches[run.start]!.segIdx;
    const endSeg = matches[run.end]!.segIdx;
    const reversed = endSeg < startSeg;

    const eMin = Math.min(startSeg, endSeg);
    const eMax = Math.max(startSeg, endSeg) + 1;

    if (reversed) {
      for (let i = eMax; i >= eMin; i--) result.push(existingPath[i]);
    } else {
      for (let i = eMin; i <= eMax; i++) result.push(existingPath[i]);
    }

    cursor = run.end + 1;
  }

  for (let i = cursor; i < n; i++) result.push(path[i]);

  return result;
};

export const parseGpx = (file: File): Promise<ILineStringGeometry> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = event => {
      const text = event.target?.result;
      if (typeof text !== 'string') {
        reject(new Error('Failed to read file content'));
        return;
      }

      const doc = new DOMParser().parseFromString(text, 'application/xml');

      if (doc.querySelector('parsererror')) {
        reject(new Error('Invalid GPX file'));
        return;
      }

      const points: ILineStringGeometry = {
        type: 'line',
        path: averageOverlappingSegments(
          Array.from(doc.querySelectorAll('trkpt'))
            .map(tp => ({
              latitude: parseFloat(tp.getAttribute('lat') ?? ''),
              longitude: parseFloat(tp.getAttribute('lon') ?? '')
            }))
            .filter(p => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude))
        )
      };

      resolve(points);
    };

    reader.readAsText(file);
  });

/**
 * Closes the route by adding the first point,
 * making start and end identical.
 */
export const bindStartAndEnd = (points: ILineStringGeometry['path']): ILineStringGeometry['path'] => {
  if (points.length < 2) return [...points];
  return [...points, { ...points[0] }];
};

/**
 * Shifts the start/end junction of a closed route by `steps` points.
 *
 * A positive `steps` value moves the junction forward along the route;
 * a negative value moves it backward.
 *
 * Only operates on closed routes (first and last point are equal).
 * Returns the original array unchanged if the route is not closed or has fewer than 3 points.
 *
 * @param points Input coordinate list (must be a closed route).
 * @param steps  Number of points to shift. Positive = forward, negative = backward. Defaults to 1.
 */
export const rotateStartEnd = (points: ILineStringGeometry['path'], steps: number = 1): ILineStringGeometry['path'] => {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];
  if (!areEqual(first, last)) return points;

  // Work on the open ring (drop the duplicate closing point).
  const ring = points.slice(0, -1);
  const len = ring.length;

  // Normalise steps so they wrap correctly for both positive and negative values.
  const shift = ((steps % len) + len) % len;

  const rotated = [...ring.slice(shift), ...ring.slice(0, shift)];

  // Re-close the ring.
  return [...rotated, { ...rotated[0] }];
};

export const toGpx = (path: ILineStringGeometry['path'], name: string): string => {
  const pts = path.map(p => `      <trkpt lat="${p.latitude}" lon="${p.longitude}"></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="gpxUtils-test">
  <trk>
    <name>${name}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
<;/gpx>`;
};

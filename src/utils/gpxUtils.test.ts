import fs from 'fs';
import { fromLonLat } from 'ol/proj';
import { getDistance } from 'ol/sphere';
import { averageOverlappingSegments, snapToExistingPath } from './gpxUtils';

// Read the GPX file
const gpxContent = fs.readFileSync('./src/utils/gpxTest.gpx', 'utf-8');

// Parse GPX manually using regex
function parseGpx(content: string) {
  const points: any[] = [];
  const regex = /<trkpt lat="([^"]+)" lon="([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    points.push({
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    });
  }
  return points;
}

// Calculate distance between two lon/lat points
function distLonLat(p1: any, p2: any) {
  return getDistance([p1.longitude, p1.latitude], [p2.longitude, p2.latitude]);
}

// Calculate total path distance
function calculatePathDistance(path: any[]) {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += distLonLat(path[i], path[i + 1]);
  }
  return totalDistance;
}

// Count consecutive duplicate points
function countDuplicates(path: any[]) {
  let count = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].latitude === path[i + 1].latitude && path[i].longitude === path[i + 1].longitude) {
      count++;
    }
  }
  return count;
}

// Detect overlapping runs using the same cumDist-gap logic as the main function
function detectOverlaps(path: any[], toleranceMeters: number = 20, minOverlapMeters: number = 80) {
  if (path.length < 2) return { totalOverlaps: 0, totalDistance: 0, runs: [] };

  const proj = path.map((p: any) => fromLonLat([p.longitude, p.latitude]));
  const n = proj.length;

  const meanLat = path.reduce((s: number, p: any) => s + p.latitude, 0) / n;
  const mercScale = 1 / Math.cos(meanLat * (Math.PI / 180));
  const projTolerance = toleranceMeters * mercScale;
  const projMinOverlap = minOverlapMeters * mercScale;

  const euclid = (a: any[], b: any[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const cumDist: number[] = new Array(n);
  cumDist[0] = 0;
  for (let i = 1; i < n; i++) {
    cumDist[i] = cumDist[i - 1] + euclid(proj[i - 1], proj[i]);
  }

  const totalLen = cumDist[n - 1];
  const minPathGap = Math.min(Math.max(projMinOverlap * 3, 500 * mercScale), totalLen / 3);

  const closestPointOnSeg = (p: any[], a: any[], b: any[]): number => {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const wx = p[0] - a[0];
    const wy = p[1] - a[1];
    const len2 = vx * vx + vy * vy;
    let t = 0;
    if (len2 > 0) t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
    const closest = [a[0] + t * vx, a[1] + t * vy];
    return euclid(p, closest);
  };

  const matches: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j + 1 < n; j++) {
      const gapToSeg = Math.min(Math.abs(cumDist[i] - cumDist[j]), Math.abs(cumDist[i] - cumDist[j + 1]));
      if (gapToSeg < minPathGap) continue;

      const dist = closestPointOnSeg(proj[i], proj[j], proj[j + 1]);
      if (dist <= projTolerance) {
        matches[i] = true;
        break;
      }
    }
  }

  const runs: any[] = [];
  let idx = 0;
  while (idx < n) {
    if (!matches[idx]) {
      idx++;
      continue;
    }

    const start = idx;
    idx++;
    while (idx < n && matches[idx]) {
      idx++;
    }

    const end = idx - 1;
    let runLen = 0;
    for (let k = start; k < end; k++) {
      runLen += euclid(proj[k], proj[k + 1]);
    }

    if (runLen >= projMinOverlap) {
      runs.push({ start, end, length: end - start + 1, distance: runLen / mercScale });
    }
  }

  const totalDistance = runs.reduce((sum: number, r: any) => sum + r.distance, 0);
  return { totalOverlaps: runs.length, totalDistance, runs };
}

// Parse the GPX file
const originalPath = parseGpx(gpxContent);

console.log('=== GPX Merge Analysis ===\n');

// Analyze overlaps
const overlaps20 = detectOverlaps(originalPath, 20, 80);
const overlaps30 = detectOverlaps(originalPath, 30, 80);

// Test with toleranceMeters = 20, minOverlapMeters = 80
console.log('📊 TEST 1: toleranceMeters=20, minOverlapMeters=80');
console.log('─'.repeat(60));

console.log('BEFORE:');
console.log(`  1. Number of segments: ${originalPath.length - 1}`);
console.log(`  2. Node duplicates: ${countDuplicates(originalPath)}`);
const distanceBefore = calculatePathDistance(originalPath);
console.log(`  3. Path distance: ${(distanceBefore / 1000).toFixed(2)} km`);
console.log(`\n  📍 Detected overlaps:`);
console.log(`     Overlapping runs: ${overlaps20.totalOverlaps}`);
console.log(`     Total overlap distance: ${(overlaps20.totalDistance / 1000).toFixed(2)} km`);
overlaps20.runs.sort((a: any, b: any) => b.distance - a.distance);
if (overlaps20.runs.length > 0) {
  console.log(`     Main overlap: ${(overlaps20.runs[0].distance / 1000).toFixed(2)} km`);
}
for (const r of overlaps20.runs) {
  const startKm = (calculatePathDistance(originalPath.slice(0, r.start + 1)) / 1000).toFixed(2);
  const endKm = (calculatePathDistance(originalPath.slice(0, r.end + 1)) / 1000).toFixed(2);
  console.log(`     Run: pts ${r.start}-${r.end} (${startKm}km - ${endKm}km), len=${(r.distance / 1000).toFixed(2)}km`);
}

const mergedPath20 = averageOverlappingSegments(originalPath, 20, 80);

console.log('\nAFTER:');
console.log(`  4. Number of segments: ${mergedPath20.length - 1}`);
console.log(`  5. Node duplicates: ${countDuplicates(mergedPath20)}`);
const distanceAfter20 = calculatePathDistance(mergedPath20);
console.log(`  6. Path distance: ${(distanceAfter20 / 1000).toFixed(2)} km`);
console.log(`  Δ Distance: ${((distanceBefore - distanceAfter20) / 1000).toFixed(3)} km reduced`);
const postOverlaps20 = detectOverlaps(mergedPath20, 20, 80);
console.log(
  `  Remaining overlaps: ${postOverlaps20.totalOverlaps} (${(postOverlaps20.totalDistance / 1000).toFixed(2)} km)\n`
);

// Test with toleranceMeters = 30, minOverlapMeters = 80
console.log('📊 TEST 2: toleranceMeters=30, minOverlapMeters=80');
console.log('─'.repeat(60));

console.log('BEFORE:');
console.log(`  1. Number of segments: ${originalPath.length - 1}`);
console.log(`  2. Node duplicates: ${countDuplicates(originalPath)}`);
console.log(`  3. Path distance: ${(distanceBefore / 1000).toFixed(2)} km`);
console.log(`\n  📍 Detected overlaps:`);
console.log(`     Overlapping runs: ${overlaps30.totalOverlaps}`);
console.log(`     Total overlap distance: ${(overlaps30.totalDistance / 1000).toFixed(2)} km`);
overlaps30.runs.sort((a: any, b: any) => b.distance - a.distance);
if (overlaps30.runs.length > 0) {
  console.log(`     Main overlap: ${(overlaps30.runs[0].distance / 1000).toFixed(2)} km`);
}
for (const r of overlaps30.runs) {
  const startKm = (calculatePathDistance(originalPath.slice(0, r.start + 1)) / 1000).toFixed(2);
  const endKm = (calculatePathDistance(originalPath.slice(0, r.end + 1)) / 1000).toFixed(2);
  console.log(`     Run: pts ${r.start}-${r.end} (${startKm}km - ${endKm}km), len=${(r.distance / 1000).toFixed(2)}km`);
}

const mergedPath30 = averageOverlappingSegments(originalPath, 30, 80);

console.log('\nAFTER:');
console.log(`  4. Number of segments: ${mergedPath30.length - 1}`);
console.log(`  5. Node duplicates: ${countDuplicates(mergedPath30)}`);
const distanceAfter30 = calculatePathDistance(mergedPath30);
console.log(`  6. Path distance: ${(distanceAfter30 / 1000).toFixed(2)} km`);
console.log(`  Δ Distance: ${((distanceBefore - distanceAfter30) / 1000).toFixed(3)} km reduced`);
const postOverlaps30 = detectOverlaps(mergedPath30, 30, 80);
console.log(
  `  Remaining overlaps: ${postOverlaps30.totalOverlaps} (${(postOverlaps30.totalDistance / 1000).toFixed(2)} km)\n`
);

console.log('='.repeat(60));
console.log('Summary:');
console.log(
  `  Tol=20: ${overlaps20.totalOverlaps} overlaps detected, ${(overlaps20.totalDistance / 1000).toFixed(2)}km total`
);
console.log(
  `  Tol=30: ${overlaps30.totalOverlaps} overlaps detected, ${(overlaps30.totalDistance / 1000).toFixed(2)}km total`
);

// Write merged GPX files
function toGpx(path: any[], name: string): string {
  const pts = path.map((p: any) => `      <trkpt lat="${p.latitude}" lon="${p.longitude}"></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="gpxUtils-test">
  <trk>
    <name>${name}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
}

fs.writeFileSync('./src/utils/gpxTest_merged20.gpx', toGpx(mergedPath20, 'Merged tol=20m'));
fs.writeFileSync('./src/utils/gpxTest_merged30.gpx', toGpx(mergedPath30, 'Merged tol=30m'));
console.log('\nWrote ./src/utils/gpxTest_merged20.gpx');
console.log('Wrote ./src/utils/gpxTest_merged30.gpx');

// Verify shared vertices: the outbound overlap and reversed return overlap
// should have identical coordinate values.
function verifySharedVertices(merged: any[], label: string) {
  const refEnd = 184;
  const followerStart = merged.length - 1 - refEnd;
  let shared = 0;
  let total = refEnd + 1;
  for (let i = 0; i <= refEnd; i++) {
    const returnIdx = merged.length - 1 - i;
    if (merged[i].latitude === merged[returnIdx].latitude && merged[i].longitude === merged[returnIdx].longitude) {
      shared++;
    }
  }
  console.log(
    `\n${label} vertex sharing: ${shared}/${total} vertices identical (${((shared / total) * 100).toFixed(1)}%)`
  );
}

verifySharedVertices(mergedPath20, 'Tol=20');
verifySharedVertices(mergedPath30, 'Tol=30');

// --- Test snapToExistingPath ---
console.log('\n' + '='.repeat(60));
console.log('📊 TEST 3: snapToExistingPath');
console.log('─'.repeat(60));

// Use the merged path (tol=20) as the "existing" path, and the original as
// the path to snap.  The overlapping portions should snap to the existing.
const snapped = snapToExistingPath(originalPath, mergedPath20, 20, 80);
const snappedDist = calculatePathDistance(snapped);
console.log(`  Original path:  ${originalPath.length} pts, ${(distanceBefore / 1000).toFixed(2)} km`);
console.log(`  Existing path:  ${mergedPath20.length} pts, ${(distanceAfter20 / 1000).toFixed(2)} km`);
console.log(`  Snapped path:   ${snapped.length} pts, ${(snappedDist / 1000).toFixed(2)} km`);

// Check how many snapped vertices are exact references from the existing path
let sharedWithExisting = 0;
for (const pt of snapped) {
  if (mergedPath20.some((e: any) => e.latitude === pt.latitude && e.longitude === pt.longitude)) {
    sharedWithExisting++;
  }
}
console.log(`  Vertices shared with existing: ${sharedWithExisting}/${snapped.length}`);

fs.writeFileSync('./src/utils/gpxTest_snapped.gpx', toGpx(snapped, 'Snapped to existing'));
console.log('  Wrote ./src/utils/gpxTest_snapped.gpx');

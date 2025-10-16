// src/lib/campusGeom.ts
export type LatLng = [number, number]; // [lat, lng]

/** Ray-casting point-in-polygon for [lat,lng] in a polygon of [lat,lng] */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersect =
      ((lngI > lng) !== (lngJ > lng)) &&
      (lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Closest point from P to segment AB (treats coords as planar — fine at campus scale) */
function closestPointOnSegment(p: LatLng, a: LatLng, b: LatLng): { q: LatLng; dist2: number } {
  const [py, px] = p;  // y=lat, x=lng
  const [ay, ax] = a;
  const [by, bx] = b;
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy || 1e-12;
  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * vx, qy = ay + t * vy;
  const dx = px - qx, dy = py - qy;
  return { q: [qy, qx], dist2: dx * dx + dy * dy };
}

/** If point is outside polygon, snap it to the nearest edge; otherwise return as-is */
export function snapToPolygonBoundary(point: LatLng, polygon: LatLng[]): LatLng {
  if (pointInPolygon(point, polygon)) return point;
  let best: { q: LatLng; dist2: number } | null = null;
  for (let i = 0; i < polygon.length - 1; i++) {
    const res = closestPointOnSegment(point, polygon[i], polygon[i + 1]);
    if (!best || res.dist2 < best.dist2) best = res;
  }
  // also check closing edge (last->first) if not closed
  const first = polygon[0], last = polygon[polygon.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    const res = closestPointOnSegment(point, last, first);
    if (!best || res.dist2 < best.dist2) best = res;
  }
  return best!.q;
}

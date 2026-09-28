// SIMULATED DATA: approximate geometry for the pilot route, for demo purposes only.
// Stop names reference real areas along the corridor; positions and segments are invented.

export type Stop = { id: number; name: string; lat: number; lng: number };
export type Segment = { id: SegmentId; name: string; stops: number[] };
export type SegmentId = "S1" | "S2" | "S3" | "S4";

export const ROUTE_NAME = "Chalco – Calzada Ignacio Zaragoza";

export const STOPS: Stop[] = [
  { id: 1, name: "Chalco (base)", lat: 19.2629, lng: -98.8973 },
  { id: 2, name: "Tlapacoya", lat: 19.3025, lng: -98.9102 },
  { id: 3, name: "Ixtapaluca", lat: 19.3175, lng: -98.93 },
  { id: 4, name: "Los Reyes La Paz", lat: 19.361, lng: -98.979 },
  { id: 5, name: "Santa Martha", lat: 19.36, lng: -99.013 },
  { id: 6, name: "Peñón Viejo", lat: 19.3736, lng: -99.0169 },
  { id: 7, name: "Guelatao", lat: 19.3849, lng: -99.0357 },
  { id: 8, name: "Tepalcates", lat: 19.3915, lng: -99.0513 },
  { id: 9, name: "Metro Zaragoza", lat: 19.4118, lng: -99.0823 },
];

// Each segment has a start stop, one interior stop and an end stop.
export const SEGMENTS: Segment[] = [
  { id: "S1", name: "Chalco – Ixtapaluca", stops: [1, 2, 3] },
  { id: "S2", name: "Ixtapaluca – Santa Martha (via Los Reyes)", stops: [3, 4, 5] },
  { id: "S3", name: "Santa Martha – Guelatao (Calz. Zaragoza)", stops: [5, 6, 7] },
  { id: "S4", name: "Guelatao – Metro Zaragoza", stops: [7, 8, 9] },
];

export const stopById = (id: number) => STOPS.find((s) => s.id === id)!;
export const segmentById = (id: string) => SEGMENTS.find((s) => s.id === id);

/** Nearest segment to a GPS point (used only in the moment, never stored). */
export function nearestSegment(lat: number, lng: number): SegmentId {
  let best: SegmentId = "S1";
  let bestD = Infinity;
  for (const seg of SEGMENTS) {
    for (const sid of seg.stops) {
      const s = stopById(sid);
      const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = seg.id;
      }
    }
  }
  return best;
}

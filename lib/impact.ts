import { SEGMENTS, SegmentId, stopById } from "./route";

export type ExceptionType = "detour" | "route_cut" | "delay";

export const TYPE_LABEL: Record<ExceptionType, string> = {
  detour: "Detour",
  route_cut: "Route cut short",
  delay: "Delay",
};

export type Impact = {
  noService: number[]; // stop ids without service
  delayed: number[]; // stop ids with delay
  alternativeStop: number | null; // where passengers should go instead
  message: string;
};

/** What an exception means for passengers, by type and segment. */
export function impactOf(type: ExceptionType, segmentId: SegmentId): Impact {
  const idx = SEGMENTS.findIndex((s) => s.id === segmentId);
  const seg = SEGMENTS[idx];
  const [start, interior, end] = seg.stops;

  if (type === "detour") {
    return {
      noService: [interior],
      delayed: [],
      alternativeStop: end,
      message: `No service at ${stopById(interior).name}. Walk to ${stopById(end).name}: service resumes there.`,
    };
  }
  if (type === "route_cut") {
    const after = new Set<number>();
    SEGMENTS.slice(idx).forEach((s) => s.stops.forEach((id) => id !== start && after.add(id)));
    return {
      noService: [...after].sort((a, b) => a - b),
      delayed: [],
      alternativeStop: start,
      message: `The route ends at ${stopById(start).name}. No service after it.`,
    };
  }
  return {
    noService: [],
    delayed: seg.stops,
    alternativeStop: null,
    message: `Expect delays between ${stopById(start).name} and ${stopById(end).name}.`,
  };
}

/** Status for one passenger stop given all active notices. */
export function stopStatus(
  stopId: number,
  notices: { type: ExceptionType; segment_id: SegmentId }[]
): { level: "ok" | "delay" | "no_service"; alternativeStop: number | null } {
  let level: "ok" | "delay" | "no_service" = "ok";
  let alternativeStop: number | null = null;
  for (const n of notices) {
    const imp = impactOf(n.type, n.segment_id);
    if (imp.noService.includes(stopId)) {
      level = "no_service";
      alternativeStop = imp.alternativeStop;
    } else if (imp.delayed.includes(stopId) && level === "ok") {
      level = "delay";
    }
  }
  return { level, alternativeStop };
}

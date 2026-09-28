import { describe, expect, it } from "vitest";
import { classify, findSegment, mentionsCheckpoint } from "../lib/classifier";
import { impactOf, stopStatus } from "../lib/impact";

describe("classifier (ML)", () => {
  it("detects a detour in Spanish", () => {
    expect(classify("hay manifestación en Zaragoza, me voy por la alterna").type).toBe("detour");
  });
  it("detects a route cut", () => {
    expect(classify("no llego al metro, corto la ruta en Guelatao").type).toBe("route_cut");
  });
  it("detects a delay in English", () => {
    expect(classify("heavy traffic, we are about 30 minutes late").type).toBe("delay");
  });
  it("returns a probability between 0 and 1", () => {
    const p = classify("desvío por marcha").probability;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe("segment gazetteer", () => {
  it("prefers Metro Zaragoza over Zaragoza", () => {
    expect(findSegment("no llego a Metro Zaragoza")).toBe("S4");
  });
  it("maps Calzada Zaragoza to S3", () => {
    expect(findSegment("manifestación en Zaragoza")).toBe("S3");
  });
  it("returns null with no place", () => {
    expect(findSegment("vamos lento")).toBeNull();
  });
});

describe("checkpoint filter", () => {
  it("flags checkpoints", () => {
    expect(mentionsCheckpoint("hay retén en Los Reyes")).toBe(true);
    expect(mentionsCheckpoint("desvío por marcha")).toBe(false);
  });
});

describe("impact on passengers", () => {
  it("detour on S3 closes Peñón Viejo and sends passengers to Guelatao", () => {
    const i = impactOf("detour", "S3");
    expect(i.noService).toEqual([6]);
    expect(i.alternativeStop).toBe(7);
  });
  it("route cut on S3 closes every stop after Santa Martha", () => {
    const i = impactOf("route_cut", "S3");
    expect(i.noService).toEqual([6, 7, 8, 9]);
    expect(i.alternativeStop).toBe(5);
  });
  it("stop status combines notices", () => {
    const s = stopStatus(6, [{ type: "detour", segment_id: "S3" }]);
    expect(s.level).toBe("no_service");
    expect(s.alternativeStop).toBe(7);
    expect(stopStatus(1, [{ type: "detour", segment_id: "S3" }]).level).toBe("ok");
  });
});

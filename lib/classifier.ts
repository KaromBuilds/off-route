// ML: a small multinomial naive Bayes classifier trained on LABELED SIMULATED phrases
// (Spanish and English), plus a place-name gazetteer to find the route segment.
// Outputs are model estimates; the driver always confirms or corrects them.

import type { ExceptionType } from "./impact";
import type { SegmentId } from "./route";

const TRAINING: [string, ExceptionType][] = [
  ["hay manifestacion en zaragoza me voy por la alterna", "detour"],
  ["marcha en la calzada nos desviamos por otra calle", "detour"],
  ["bloqueo en los reyes tomo la vía alterna", "detour"],
  ["me desvio por la lateral no paso por la parada", "detour"],
  ["desvio por obra no entro al mercado", "detour"],
  ["cerraron la calle damos la vuelta por otra avenida", "detour"],
  ["protest on zaragoza taking the alternate road", "detour"],
  ["road blocked going around through another street", "detour"],
  ["detour because of construction skipping the stop", "detour"],
  ["hasta aqui llego la ruta no llego al metro", "route_cut"],
  ["corto la ruta en santa martha ya no sigo", "route_cut"],
  ["accidente adelante me regreso desde guelatao", "route_cut"],
  ["ya no llego a la base me quedo en los reyes", "route_cut"],
  ["termino el recorrido antes bajan todos aqui", "route_cut"],
  ["route ends here not going to the metro", "route_cut"],
  ["cutting the route short turning back at guelatao", "route_cut"],
  ["last stop is santa martha today", "route_cut"],
  ["mucho trafico vamos con retraso de media hora", "delay"],
  ["esta lento por el choque vamos tarde", "delay"],
  ["retraso en la autopista unos treinta minutos", "delay"],
  ["trafico parado en ixtapaluca tardamos mas", "delay"],
  ["vamos lentos por la lluvia", "delay"],
  ["heavy traffic running thirty minutes late", "delay"],
  ["slow because of a crash we are delayed", "delay"],
  ["delay on the highway about twenty minutes", "delay"],
];

const CLASSES: ExceptionType[] = ["detour", "route_cut", "delay"];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

type Model = { vocab: Set<string>; counts: Record<string, Map<string, number>>; totals: Record<string, number>; priors: Record<string, number> };

function train(): Model {
  const vocab = new Set<string>();
  const counts: Record<string, Map<string, number>> = {};
  const totals: Record<string, number> = {};
  const docs: Record<string, number> = {};
  for (const c of CLASSES) {
    counts[c] = new Map();
    totals[c] = 0;
    docs[c] = 0;
  }
  for (const [text, label] of TRAINING) {
    docs[label]++;
    for (const w of tokenize(text)) {
      vocab.add(w);
      counts[label].set(w, (counts[label].get(w) ?? 0) + 1);
      totals[label]++;
    }
  }
  const priors: Record<string, number> = {};
  for (const c of CLASSES) priors[c] = docs[c] / TRAINING.length;
  return { vocab, counts, totals, priors };
}

const MODEL = train();

export function classify(text: string): { type: ExceptionType; probability: number; scores: Record<ExceptionType, number> } {
  const words = tokenize(text).filter((w) => MODEL.vocab.has(w));
  const V = MODEL.vocab.size;
  const logs = CLASSES.map((c) => {
    let lp = Math.log(MODEL.priors[c]);
    for (const w of words) lp += Math.log(((MODEL.counts[c].get(w) ?? 0) + 1) / (MODEL.totals[c] + V));
    return lp;
  });
  const max = Math.max(...logs);
  const exps = logs.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  const i = probs.indexOf(Math.max(...probs));
  const scores = Object.fromEntries(CLASSES.map((c, k) => [c, probs[k]])) as Record<ExceptionType, number>;
  return { type: CLASSES[i], probability: probs[i], scores };
}

// Longest names first so "metro zaragoza" wins over "zaragoza".
const GAZETTEER: [string, SegmentId][] = [
  ["metro zaragoza", "S4"],
  ["tepalcates", "S4"],
  ["guelatao", "S3"],
  ["santa martha", "S3"],
  ["penon", "S3"],
  ["calzada", "S3"],
  ["zaragoza", "S3"],
  ["los reyes", "S2"],
  ["la paz", "S2"],
  ["autopista", "S2"],
  ["ixtapaluca", "S1"],
  ["tlapacoya", "S1"],
  ["chalco", "S1"],
];

export function findSegment(text: string): SegmentId | null {
  const t = tokenize(text).join(" ");
  for (const [name, seg] of GAZETTEER) if (t.includes(name)) return seg;
  return null;
}

const CHECKPOINT_WORDS = ["reten", "retén", "policia", "patrulla", "checkpoint", "police", "transito"];

/** Off Route does not publish police checkpoints (Blueprint condition 5). */
export function mentionsCheckpoint(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CHECKPOINT_WORDS.some((w) => t.includes(w.normalize("NFD").replace(/[̀-ͯ]/g, "")));
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { SEGMENTS, nearestSegment, segmentById, type SegmentId } from "@/lib/route";
import { classify, findSegment, mentionsCheckpoint } from "@/lib/classifier";
import { impactOf, TYPE_LABEL, type ExceptionType } from "@/lib/impact";
import { supabase, NOT_CONFIGURED } from "@/lib/supabase";
import { useSession, signInWithGoogle } from "@/lib/useSession";
import { useTelemetry, type TelemetryMode } from "@/lib/useTelemetry";
import { useSpeech } from "@/lib/useSpeech";

type Draft = {
  transcript: string;
  type: ExceptionType;
  probability: number;
  segment: SegmentId | "";
  checkpoint: boolean;
};

const MAX = 280;

export default function DriverPage() {
  const { session, ready } = useSession();
  const [mode, setMode] = useState<TelemetryMode>("gps");
  const { motion, speedKmh, gpsError, position } = useTelemetry(mode);
  const [lang, setLang] = useState("es-MX");
  const speech = useSpeech(lang);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [lastPublished, setLastPublished] = useState<{ segment: SegmentId; type: ExceptionType } | null>(null);
  const [busy, setBusy] = useState(false);

  const stopped = motion === "stopped";

  function makeDraft(text: string) {
    const t = text.trim().slice(0, MAX);
    if (!t) return;
    const c = classify(t);
    const checkpoint = mentionsCheckpoint(t);
    const seg = findSegment(t) ?? (position ? nearestSegment(position.lat, position.lng) : "");
    setDraft({ transcript: t, type: checkpoint ? "delay" : c.type, probability: c.probability, segment: seg, checkpoint });
    setMsg(null);
  }

  async function confirm() {
    if (!draft || !supabase || !session) return;
    const transcript = draft.transcript.trim();
    if (transcript.length < 1 || transcript.length > MAX) return setMsg({ kind: "err", text: `The report must be 1–${MAX} characters.` });
    if (!draft.segment) return setMsg({ kind: "err", text: "Choose the part of the route." });
    setBusy(true);
    const { error } = await supabase.from("off_route_reports").insert({
      driver_id: session.user.id,
      transcript,
      type: draft.type,
      segment_id: draft.segment,
      model_confidence: Number(draft.probability.toFixed(3)),
    });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: "Could not publish. Check your connection and try again." });
    setLastPublished({ segment: draft.segment, type: draft.type });
    setDraft(null);
    setTyped("");
    setMsg({ kind: "ok", text: "Published as UNVERIFIED. It becomes CONFIRMED when another driver reports the same. It expires in 2 hours." });
  }

  async function simulatePeer() {
    if (!supabase || !lastPublished) return;
    setBusy(true);
    const { error } = await supabase.rpc("simulate_peer_report", { p_segment: lastPublished.segment, p_type: lastPublished.type });
    setBusy(false);
    setMsg(error
      ? { kind: "err", text: "Could not add the simulated report." }
      : { kind: "ok", text: "A SIMULATED second driver reported the same. The passenger map now shows it as CONFIRMED." });
  }

  if (!supabase) return <div className="card">{NOT_CONFIGURED}</div>;
  if (!ready) return <p className="muted">Loading…</p>;

  if (!session) {
    return (
      <>
        <h1>Driver sign-in</h1>
        <p>Sign in to report route exceptions on the pilot route.</p>
        <div className="card">
          <b>What Off Route keeps</b>
          <p className="muted">Only the reports you confirm: what you said, the type and the part of the route. They expire in 2 hours.
            Passengers never see who reported. No scores, no rankings, no location history. You can edit or delete any report.</p>
        </div>
        <button className="btn" onClick={() => signInWithGoogle("/driver")}>Sign in with Google</button>
      </>
    );
  }

  const impact = draft?.segment ? impactOf(draft.type, draft.segment) : null;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Report an exception</h1>
        <Link href="/driver/reports">My reports →</Link>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>Vehicle: {motion === "moving" ? "🚐 Moving" : motion === "stopped" ? "🅿️ Stopped" : "📡 Waiting for GPS…"}
            {speedKmh !== null && <span className="muted"> · {speedKmh} km/h</span>}</b>
        </div>
        <label>Telemetry source</label>
        <div className="seg" role="group" aria-label="Telemetry source">
          <button className={mode === "gps" ? "on" : ""} onClick={() => setMode("gps")}>Real GPS</button>
          <button className={mode === "sim_moving" ? "on" : ""} onClick={() => setMode("sim_moving")}>Simulated: moving</button>
          <button className={mode === "sim_stopped" ? "on" : ""} onClick={() => setMode("sim_stopped")}>Simulated: stopped</button>
        </div>
        {gpsError && mode === "gps" && <p className="small muted">{gpsError}</p>}
        <p className="small muted" style={{ marginBottom: 0 }}>Location is used only to know if you are stopped. It is never saved.</p>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ marginTop: 0 }}><b>Tap once and say what the route is doing.</b><br />
          <span className="muted small">e.g. &quot;Protest on Zaragoza, taking the alternate road&quot;</span></p>
        <button className={`btn mic ${speech.listening ? "listening" : ""}`}
          onClick={() => (speech.listening ? speech.stop() : speech.start(makeDraft))} disabled={!speech.supported}>
          🎙️<span>{speech.listening ? "Listening…" : "Report"}</span>
        </button>
        <div className="row" style={{ justifyContent: "center" }}>
          <label htmlFor="lang" style={{ margin: 0 }}>Voice language</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: "auto" }}>
            <option value="es-MX">Español (MX)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>
        {!speech.supported && <p className="small muted">Voice isn&apos;t supported in this browser (try Chrome). You can type the report when stopped.</p>}
        {speech.error && <p className="small" role="alert">{speech.error}</p>}
      </div>

      {!draft && stopped && (
        <div className="card">
          <label htmlFor="typed">Or type it (only while stopped)</label>
          <textarea id="typed" rows={2} maxLength={MAX} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <span className="small muted">{typed.length}/{MAX}</span>
            <button className="btn secondary" onClick={() => makeDraft(typed)} disabled={!typed.trim()}>Create draft</button>
          </div>
        </div>
      )}

      {draft && !stopped && (
        <div className="locked" role="status">
          Draft saved on this phone. 🚐 Vehicle moving — confirm when stopped.
        </div>
      )}

      {draft && stopped && (
        <div className="card">
          <b>Check what the app understood</b>
          <p className="small muted">Nothing is published until you confirm.</p>
          {draft.checkpoint && (
            <p className="status-box delay small">Off Route does not publish police checkpoints. If it is causing a delay, it will be published only as a delay, without the cause.</p>
          )}
          <label htmlFor="tr">What you said</label>
          <textarea id="tr" rows={2} maxLength={MAX} value={draft.transcript}
            onChange={(e) => setDraft({ ...draft, transcript: e.target.value })} />
          <div className="grid2">
            <div>
              <label htmlFor="type">Type <span className="muted small">(model estimate {Math.round(draft.probability * 100)}%)</span></label>
              <select id="type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ExceptionType })}>
                {(Object.keys(TYPE_LABEL) as ExceptionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="seg">Part of the route</label>
              <select id="seg" value={draft.segment} onChange={(e) => setDraft({ ...draft, segment: e.target.value as SegmentId })}>
                <option value="">Choose…</option>
                {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {impact && draft.segment && (
            <p className="status-box no_service small" style={{ marginTop: 12 }}>
              Passengers will see: {TYPE_LABEL[draft.type]} on {segmentById(draft.segment)?.name}. {impact.message}
            </p>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={confirm} disabled={busy}>Confirm and publish</button>
            <button className="btn secondary" onClick={() => setDraft(null)} disabled={busy}>Delete draft</button>
          </div>
        </div>
      )}

      {msg && <div className={`status-box ${msg.kind === "ok" ? "ok" : "no_service"}`} role="status">{msg.text}</div>}

      {lastPublished && (
        <div className="card">
          <span className="pill sim">Demo tool</span>
          <p className="small muted">For the demo only: add a SIMULATED second driver who agrees with your last report, so it becomes confirmed.</p>
          <div className="row">
            <button className="btn secondary" onClick={simulatePeer} disabled={busy}>Simulate a second driver</button>
            <Link href="/passenger" className="btn secondary">Open passenger map</Link>
          </div>
        </div>
      )}

      <p className="small muted">Signed in as {session.user.email}. <button className="btn secondary small" style={{ padding: "4px 8px", fontSize: 12 }}
        onClick={() => supabase?.auth.signOut()}>Sign out</button></p>
    </>
  );
}

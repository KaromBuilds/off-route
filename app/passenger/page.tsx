"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { STOPS, ROUTE_NAME, stopById, segmentById } from "@/lib/route";
import { impactOf, stopStatus, TYPE_LABEL } from "@/lib/impact";
import { supabase, NOT_CONFIGURED, type PublicNotice } from "@/lib/supabase";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false, loading: () => <div className="map" /> });

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function PassengerPage() {
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [stop, setStop] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string>("");

  const load = useCallback(async () => {
    if (!supabase) { setError(NOT_CONFIGURED); return; }
    const { data, error } = await supabase.rpc("off_route_public_notices");
    if (error) { setError("Could not load today's notices. Try again in a moment."); return; }
    setError(null);
    setNotices((data ?? []) as PublicNotice[]);
    setUpdated(new Date().toISOString());
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const mine = stop ? stopStatus(stop, notices) : null;

  return (
    <>
      <h1>Is my stop running?</h1>
      <p className="muted">{ROUTE_NAME} · inbound to Metro Zaragoza{updated && ` · updated ${time(updated)}`}</p>

      <label htmlFor="stop">My stop</label>
      <select id="stop" value={stop ?? ""} onChange={(e) => setStop(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Choose your stop…</option>
        {STOPS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {mine && stop && (
        <div className={`status-box ${mine.level}`} style={{ marginTop: 12 }} aria-live="polite">
          {mine.level === "ok" && <>✓ {stopById(stop).name}: normal service reported.</>}
          {mine.level === "delay" && <>⏱ {stopById(stop).name}: service running with delays.</>}
          {mine.level === "no_service" && (
            <>✕ No service at {stopById(stop).name} right now.
              {mine.alternativeStop && <> Go to <u>{stopById(mine.alternativeStop).name}</u> instead.</>}</>
          )}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <RouteMap notices={notices} selectedStop={stop} onSelectStop={setStop} />
      </div>
      <p className="small muted">Tap a stop on the map to select it. Red = no service · Amber = delays · Green = normal.</p>

      {error && <div className="card" role="alert">{error}</div>}

      <h2>Today&apos;s route notices</h2>
      {!error && notices.length === 0 && <div className="card muted">No active notices. The route is running as usual.</div>}
      {notices.map((n) => {
        const imp = impactOf(n.type, n.segment_id);
        return (
          <div key={n.segment_id + n.type} className={`card notice ${imp.noService.length ? "no_service" : ""}`}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{TYPE_LABEL[n.type]} · {segmentById(n.segment_id)?.name}</b>
              <span className={`pill ${n.status}`}>{n.status === "confirmed" ? "Confirmed" : "Unverified"}</span>
            </div>
            <p style={{ margin: "8px 0" }}>{imp.message}</p>
            <p className="small muted" style={{ margin: 0 }}>
              {n.status === "confirmed"
                ? `Confirmed by ${n.reporters} drivers`
                : "Only one driver has reported this so far. Treat with care."}
              {" · "}since {time(n.first_reported)} · expires {time(n.expires_at)}
              {n.has_simulated && <> · <span className="pill sim">includes simulated report</span></>}
            </p>
          </div>
        );
      })}
      <p className="small muted">Notices come from drivers on this route. We never show who reported.</p>
    </>
  );
}

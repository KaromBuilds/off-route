"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SEGMENTS, segmentById, type SegmentId } from "@/lib/route";
import { TYPE_LABEL, type ExceptionType } from "@/lib/impact";
import { supabase, NOT_CONFIGURED, type Report } from "@/lib/supabase";
import { useSession, signInWithGoogle } from "@/lib/useSession";

const MAX = 280;
const time = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function MyReportsPage() {
  const { session, ready } = useSession();
  const [rows, setRows] = useState<Report[]>([]);
  const [editing, setEditing] = useState<Report | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from("off_route_reports")
      .select("id, transcript, type, segment_id, model_confidence, created_at, expires_at")
      .order("created_at", { ascending: false });
    if (error) return setMsg("Could not load your reports.");
    setRows((data ?? []) as Report[]);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!supabase || !editing) return;
    const t = editing.transcript.trim();
    if (t.length < 1 || t.length > MAX) return setMsg(`The report must be 1–${MAX} characters.`);
    const { error } = await supabase.from("off_route_reports")
      .update({ transcript: t, type: editing.type, segment_id: editing.segment_id }).eq("id", editing.id);
    setMsg(error ? "Could not save the correction." : "Correction saved.");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!supabase || !confirm("Delete this report? It disappears from the passenger map.")) return;
    const { error } = await supabase.from("off_route_reports").delete().eq("id", id);
    setMsg(error ? "Could not delete." : "Report deleted.");
    load();
  }

  if (!supabase) return <div className="card">{NOT_CONFIGURED}</div>;
  if (!ready) return <p className="muted">Loading…</p>;
  if (!session) return <button className="btn" onClick={() => signInWithGoogle("/driver/reports")}>Sign in with Google</button>;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>My reports</h1>
        <Link href="/driver">← Report</Link>
      </div>
      <div className="card small">
        <b>This is everything Off Route keeps from you.</b> Passengers only see the type and the part of the route, never your
        name or what you said. Nothing here is used to score or evaluate you. Correct or delete anything.
      </div>
      {msg && <div className="status-box ok" role="status">{msg}</div>}
      {rows.length === 0 && <div className="card muted">You have no reports.</div>}
      {rows.map((r) => {
        const active = new Date(r.expires_at) > new Date();
        const isEditing = editing?.id === r.id;
        return (
          <div className="card" key={r.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{TYPE_LABEL[r.type]} · {segmentById(r.segment_id)?.name}</b>
              <span className={`pill ${active ? "confirmed" : "unverified"}`}>{active ? `Active until ${time(r.expires_at)}` : "Expired"}</span>
            </div>
            {!isEditing && <p style={{ margin: "8px 0" }}>&ldquo;{r.transcript}&rdquo;</p>}
            {isEditing && editing && (
              <>
                <label>What you said</label>
                <textarea rows={2} maxLength={MAX} value={editing.transcript} onChange={(e) => setEditing({ ...editing, transcript: e.target.value })} />
                <div className="grid2">
                  <div>
                    <label>Type</label>
                    <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as ExceptionType })}>
                      {(Object.keys(TYPE_LABEL) as ExceptionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Part of the route</label>
                    <select value={editing.segment_id} onChange={(e) => setEditing({ ...editing, segment_id: e.target.value as SegmentId })}>
                      {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
            <p className="small muted" style={{ margin: "4px 0 10px" }}>Reported {time(r.created_at)}
              {r.model_confidence !== null && ` · model estimate ${Math.round(r.model_confidence * 100)}%`}</p>
            <div className="row">
              {isEditing
                ? <><button className="btn" onClick={save}>Save correction</button><button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button></>
                : <><button className="btn secondary" onClick={() => setEditing(r)}>Correct</button><button className="btn danger" onClick={() => remove(r.id)}>Delete</button></>}
            </div>
          </div>
        );
      })}
    </>
  );
}

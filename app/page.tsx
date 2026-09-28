import Link from "next/link";
import { ROUTE_NAME } from "@/lib/route";

export default function Home() {
  return (
    <>
      <h1>When the route changes, the driver knows first.</h1>
      <p className="muted">Pilot route: {ROUTE_NAME}</p>
      <p>
        Off Route lets colectivo drivers report a detour, a route cut or a delay <b>by voice</b>. Passengers see which stops
        have no service and where to go instead. Every notice is confirmed by drivers and expires on its own.
      </p>
      <div className="grid2">
        <Link href="/passenger" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 style={{ marginTop: 0 }}>I&apos;m a passenger →</h2>
          <p className="muted">Check today&apos;s route map. No sign-in needed.</p>
        </Link>
        <Link href="/driver" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 style={{ marginTop: 0 }}>I&apos;m a driver →</h2>
          <p className="muted">Report an exception. Sign in with Google.</p>
        </Link>
      </div>
      <div className="card">
        <b>What we never do with drivers&apos; data</b>
        <p className="muted" style={{ marginBottom: 0 }}>
          No scores, no rankings, no location history. Passengers never see who reported. Drivers can edit or delete
          everything they report. Police checkpoints are not reported.
        </p>
      </div>
    </>
  );
}

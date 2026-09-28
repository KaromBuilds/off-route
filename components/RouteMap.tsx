"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { SEGMENTS, STOPS, stopById } from "@/lib/route";
import { stopStatus, impactOf } from "@/lib/impact";
import type { PublicNotice } from "@/lib/supabase";

const COLORS = { ok: "#0f766e", delay: "#d97706", no_service: "#b91c1c" };

export default function RouteMap({ notices, selectedStop, onSelectStop }: {
  notices: PublicNotice[];
  selectedStop: number | null;
  onSelectStop: (id: number) => void;
}) {
  const line = STOPS.map((s) => [s.lat, s.lng] as [number, number]);
  const affected = new Set<string>();
  notices.forEach((n) => { if (impactOf(n.type, n.segment_id).noService.length) affected.add(n.segment_id); });

  return (
    <div className="map">
      <MapContainer center={[19.345, -98.98]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={line} pathOptions={{ color: "#0f766e", weight: 5, opacity: 0.8 }} />
        {SEGMENTS.filter((s) => affected.has(s.id)).map((s) => (
          <Polyline key={s.id} positions={s.stops.map((id) => [stopById(id).lat, stopById(id).lng] as [number, number])}
            pathOptions={{ color: "#b91c1c", weight: 7, dashArray: "8 8" }} />
        ))}
        {STOPS.map((s) => {
          const st = stopStatus(s.id, notices);
          return (
            <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={selectedStop === s.id ? 11 : 8}
              pathOptions={{ color: "#fff", weight: 2, fillColor: COLORS[st.level], fillOpacity: 1 }}
              eventHandlers={{ click: () => onSelectStop(s.id) }}>
              <Tooltip>{s.name}{st.level === "no_service" ? " — no service now" : st.level === "delay" ? " — delays" : ""}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

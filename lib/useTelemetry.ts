"use client";

// Phone telemetry: decides only "moving" vs "stopped", live.
// Positions are kept in memory for this screen and never stored or sent anywhere.

import { useEffect, useRef, useState } from "react";

export type Motion = "moving" | "stopped" | "unknown";
export type TelemetryMode = "gps" | "sim_moving" | "sim_stopped";

const MOVING_MS = 1.5; // ~5 km/h

function metersBetween(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371000, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude), dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useTelemetry(mode: TelemetryMode) {
  const [motion, setMotion] = useState<Motion>("unknown");
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const last = useRef<{ c: GeolocationCoordinates; t: number } | null>(null);

  useEffect(() => {
    if (mode === "sim_moving") { setMotion("moving"); setSpeedKmh(32); return; }
    if (mode === "sim_stopped") { setMotion("stopped"); setSpeedKmh(0); return; }
    setMotion("unknown"); setSpeedKmh(null);
    if (!("geolocation" in navigator)) { setGpsError("This phone does not share location."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null);
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        let speed = p.coords.speed;
        if ((speed === null || Number.isNaN(speed)) && last.current) {
          const dt = (p.timestamp - last.current.t) / 1000;
          if (dt > 0) speed = metersBetween(last.current.c, p.coords) / dt;
        }
        last.current = { c: p.coords, t: p.timestamp };
        if (speed === null || Number.isNaN(speed)) return;
        setSpeedKmh(Math.round(speed * 3.6));
        setMotion(speed > MOVING_MS ? "moving" : "stopped");
      },
      () => setGpsError("Location permission is off. Use the simulated telemetry switch for the demo."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode]);

  return { motion, speedKmh, gpsError, position };
}

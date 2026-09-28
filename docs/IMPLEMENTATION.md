# Off Route — Implementation Prompt

Generated from `docs/PACKET.md`. This is the build prompt for the coding agent.

## Context
Build **Off Route**, a mobile-first web app where colectivo drivers on ONE pilot route (Chalco – Calzada Ignacio Zaragoza) report operational exceptions (detour, route cut, delay) by voice, confirm them only while the vehicle is stopped, and passengers see on a map which stops have no service and where to go instead. All route geometry, stops and peer reports are SIMULATED and must be labeled on screen.

Stack: Next.js (App Router, TypeScript) · Supabase (Postgres, Auth with Google, RLS) · Leaflet + OpenStreetMap · Web Speech API · Geolocation API · in-app ML (naive Bayes text classifier + clustering). Free tier only. UI in English.

## Hard constraints (Blueprint conditions)
- Never show a driver's identity on any passenger or public screen.
- No driver scores, rankings or evaluations.
- GPS is used only live, to decide "moving vs stopped". Never stored.
- No police-checkpoint category.
- Every notice has an expiry. Nothing is published without driver confirmation.
- Drivers can see, edit and delete their own reports.

## Features, in order (each one small and testable)

**F1 — Scaffold + simulated route data**
Next.js app, SIMULATED DATA banner on every page, simulated route (8 stops, 5 segments) in `lib/route.ts`.
*Acceptance:* home page links to Driver and Passenger; banner visible.

**F2 — Passenger map**
Leaflet map with route line and stops; list of active notices.
*Acceptance:* map renders without login; stops clickable; empty state when no notices.

**F3 — ML classifier + notice logic**
Naive Bayes classifier (Spanish + English phrases) → type (detour / route_cut / delay) with probability; gazetteer → segment; `affectedStops()` computes stops without service and the alternative stop.
*Acceptance:* unit tests pass for classification and affected-stop logic.

**F4 — Supabase schema + auth**
`reports` table with RLS (own rows only), length check on transcript, `get_public_notices()` function returning only non-identifying aggregated fields with confidence (distinct reporters), `simulate_peer_report()` for the labeled demo peer.
*Acceptance:* driver B cannot read driver A's rows; public function exposes no driver id.

**F5 — Driver voice report + stop gate**
Big Report button → speech-to-text (fallback: typing) → classifier → DRAFT. Confirm/correct/delete unlocked only when GPS speed ≈ 0 (demo override toggle labeled "Simulated telemetry").
*Acceptance:* moving = locked; stopped = confirm works; report saved as unverified.

**F6 — Confirmation + expiry + My reports**
Second reporter → CONFIRMED; expired notices hidden; "My reports" page to edit/delete.
*Acceptance:* test plan items 5–9 pass.

## Commit plan
1. `F1 scaffold, simulated route data, banner`
2. `F2 passenger map with Leaflet`
3. `F3 ML classifier and affected-stop logic with tests`
4. `F4 Supabase schema, RLS and auth client`
5. `F5 driver voice report with stop gate`
6. `F6 confirmation, expiry and My reports`
7. Fixes from the test pass → redeploy.

Deploy after F2 (deploy 1) and after F6 (deploy 2).

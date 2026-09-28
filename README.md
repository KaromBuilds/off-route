# Off Route

Colectivo drivers report route exceptions (detour, route cut, delay) **by voice**. Passengers see which stops have no service and where to go instead. Notices are confirmed by drivers and expire on their own.

Week 7 · Business Bending · Pilot route: Chalco – Calzada Ignacio Zaragoza. **All route data and peer reports are simulated.**

- Packet: [`docs/PACKET.md`](docs/PACKET.md) · Build prompt: [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) · Decisions: [`DECISIONS.md`](DECISIONS.md)
- Stack: Next.js · Supabase (Google sign-in, RLS) · Leaflet + OpenStreetMap · Web Speech API · Geolocation API · naive Bayes classifier

## Run locally
1. `npm install`
2. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never commit it).
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. `npm run dev` · tests: `npx vitest run`

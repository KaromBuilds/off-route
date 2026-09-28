import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keys come only from environment variables (Vercel), never from the repo.
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } }) : null;

export const NOT_CONFIGURED =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY as environment variables.";

export type PublicNotice = {
  segment_id: "S1" | "S2" | "S3" | "S4";
  type: "detour" | "route_cut" | "delay";
  reporters: number;
  status: "confirmed" | "unverified";
  first_reported: string;
  expires_at: string;
  has_simulated: boolean;
};

export type Report = {
  id: string;
  transcript: string;
  type: "detour" | "route_cut" | "delay";
  segment_id: "S1" | "S2" | "S3" | "S4";
  model_confidence: number | null;
  created_at: string;
  expires_at: string;
};

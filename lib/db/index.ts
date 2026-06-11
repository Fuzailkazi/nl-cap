import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseService, requireSupabaseBrowser } from "@/lib/config/env";

/**
 * Supabase clients. Both are lazily constructed so importing this module never
 * fails when a key is still blank (keys-later build). Construction throws only
 * when a client is actually requested without its configured key.
 */

let _service: SupabaseClient | null = null;

/**
 * Server-only client using the service-role key. Bypasses RLS — NEVER import
 * this into a client component. Used by ingest/eval scripts and route handlers.
 */
export function serviceClient(): SupabaseClient {
  if (_service) return _service;
  const { url, serviceRoleKey } = requireSupabaseService();
  _service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}

let _browser: SupabaseClient | null = null;

/** Browser client using the anon/publishable key. Safe for client components. */
export function browserClient(): SupabaseClient {
  if (_browser) return _browser;
  const { url, anonKey } = requireSupabaseBrowser();
  _browser = createClient(url, anonKey);
  return _browser;
}

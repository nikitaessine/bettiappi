import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // In dev this will show up in the server logs if misconfigured
  console.warn("Supabase anon env vars are not set.");
}

export const supabaseBrowserClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

export const supabaseServerClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });


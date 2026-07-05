import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL?.trim() || !SUPABASE_PUBLISHABLE_KEY?.trim()) {
  throw new Error(
    "Chýbajú premenné prostredia VITE_SUPABASE_URL alebo VITE_SUPABASE_PUBLISHABLE_KEY. Skopírujte .env.example na .env a vyplňte hodnoty z projektu Supabase."
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
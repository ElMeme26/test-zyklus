import { createClient } from '@supabase/supabase-js';

// Esto permite que use las variables de Netlify en producción 
// y tu .env en local automáticamente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
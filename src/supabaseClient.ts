import { createClient } from '@supabase/supabase-js';

// ✅ TU URL REAL (Extraída de tu conexión anterior)
const supabaseUrl = 'https://qhictrmgiulnsfaqxtog.supabase.co';
// ✅ TU KEY REAL (Extraída de tu conexión anterior)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWN0cm1naXVsbnNmYXF4dG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTQ4NjIsImV4cCI6MjA4NjMzMDg2Mn0.Sxet-l9vbFYVCUGY-PvDcXyQETtwqvMHLX51x0DsKy4';

export const supabase = createClient(supabaseUrl, supabaseKey);
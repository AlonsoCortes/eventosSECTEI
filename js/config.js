// Configuración de Supabase
// Reemplazar con los valores reales del proyecto en Supabase:
// Settings → API → Project URL y anon public key

const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

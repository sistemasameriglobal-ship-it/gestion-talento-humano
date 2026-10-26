import { createClient } from '@supabase/supabase-js'

// 🔧 CONFIGURA TUS CREDENCIALES DE SUPABASE AQUÍ
// Ve a: https://app.supabase.com → tu proyecto → Settings → API
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim() || 'https://TU_URL.supabase.co'
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() || 'TU_ANON_KEY'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ [Supabase] Las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están configuradas.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})


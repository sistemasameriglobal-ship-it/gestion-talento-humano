// =============================================================
// src/api/sistema.js
// Métricas de Supabase para la pantalla "Sistema" (solo admin).
// Requiere haber ejecutado SQL/06_ADMIN_METRICAS_SISTEMA.sql
// =============================================================
import { supabase } from '../supabaseClient'

export async function obtenerMetricasSistema() {
  const t0 = performance.now()
  const { data, error } = await supabase.rpc('admin_metricas_sistema')
  const latenciaMs = Math.round(performance.now() - t0)
  return { data, error, latenciaMs }
}

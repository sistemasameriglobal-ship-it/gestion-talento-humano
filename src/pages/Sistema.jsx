// =============================================================
// src/pages/Sistema.jsx  (solo administradores)
// - Navegador: memoria y almacenamiento de ESTA pestaña.
// - Supabase: base de datos, storage, usuarios, conexiones.
// =============================================================
import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, Database, HardDrive, Users, Plug, Gauge, Cpu } from 'lucide-react'
import PageTitle from '../components/ui/PageTitle'
import KpiCard, { KpiGrid } from '../components/ui/KpiCard'
import { obtenerMetricasSistema } from '../api/sistema'
import './sistema.css'

// Límites del plan de Supabase. Ajústalos si cambias de plan (Free: 500 MB / 1 GB / 50 000).
const LIMITES = {
  dbBytes: 500 * 1024 ** 2,
  storageBytes: 1024 ** 3,
  usuarios: 50000,
  conexiones: 60,
}

const fmtBytes = (b) => {
  if (b == null) return '—'
  if (b < 1024) return `${b} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let i = -1
  do { b /= 1024; i++ } while (b >= 1024 && i < u.length - 1)
  return `${b.toFixed(b >= 100 ? 0 : 1)} ${u[i]}`
}

const colorPct = (p) => (p >= 85 ? 'var(--danger)' : p >= 60 ? 'var(--warning)' : 'var(--success)')

function Barra({ label, usado, limite, formato = fmtBytes }) {
  const pct = Math.min(100, (usado / limite) * 100)
  return (
    <div className="sys-bar-row">
      <div className="sys-bar-top">
        <span>{label}</span>
        <span>{formato(usado)} de {formato(limite)} · {pct.toFixed(1)}%</span>
      </div>
      <div className="sys-bar"><div style={{ width: `${pct}%`, background: colorPct(pct) }} /></div>
    </div>
  )
}

function leerNavegador() {
  const mem = performance.memory // solo Chrome / Edge
  let ls = 0
  try { for (const k of Object.keys(localStorage)) ls += (k.length + (localStorage.getItem(k) || '').length) * 2 } catch { /* ignore */ }
  return {
    heapUsado: mem?.usedJSHeapSize ?? null,
    heapLimite: mem?.jsHeapSizeLimit ?? null,
    localStorageBytes: ls,
    ramDispositivoGB: navigator.deviceMemory ?? null,
    nucleos: navigator.hardwareConcurrency ?? null,
    conexion: navigator.connection?.effectiveType ?? null,
  }
}

export default function Sistema() {
  const [nav, setNav] = useState(leerNavegador)
  const [cuota, setCuota] = useState(null)
  const [sb, setSb] = useState(null)
  const [latencia, setLatencia] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargarSupabase = useCallback(async () => {
    setCargando(true)
    setError('')
    const { data, error: err, latenciaMs } = await obtenerMetricasSistema()
    if (err) setError(err.message || 'No se pudieron cargar las métricas.')
    else { setSb(data); setLatencia(latenciaMs) }
    setCargando(false)
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargarSupabase)
    navigator.storage?.estimate?.().then(setCuota).catch(() => {})
    const id = setInterval(() => setNav(leerNavegador()), 5000)
    return () => clearInterval(id)
  }, [cargarSupabase])

  const pctHeap = nav.heapUsado && nav.heapLimite ? (nav.heapUsado / nav.heapLimite) * 100 : null

  return (
    <div>
      <div className="page-header sys-head">
        <div>
          <PageTitle icon={Activity}>Sistema</PageTitle>
          <p>Consumo de la página y de Supabase. Visible solo para administradores.</p>
        </div>
        <button className="btn btn-secondary" onClick={cargarSupabase} disabled={cargando}>
          <RefreshCw size={14} /> {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="sys-section">
        <h2>Este navegador</h2>
        <p>
          Mide la pestaña que tienes abierta ahora, no el servidor. La memoria del código solo la
          reporta Chrome y Edge.
        </p>
        <KpiGrid>
          <KpiCard label="Memoria de la página" icon={Gauge} tone={pctHeap >= 60 ? 'warning' : 'success'}
            value={fmtBytes(nav.heapUsado)}
            sub={pctHeap != null ? `${pctHeap.toFixed(1)}% del límite (${fmtBytes(nav.heapLimite)})` : 'No disponible en este navegador'} />
          <KpiCard label="Almacenamiento local" icon={HardDrive} tone="info"
            value={fmtBytes(cuota?.usage ?? nav.localStorageBytes)}
            sub={cuota?.quota ? `de ${fmtBytes(cuota.quota)} permitidos` : 'localStorage'} />
          <KpiCard label="RAM del equipo" icon={Cpu}
            value={nav.ramDispositivoGB ? `${nav.ramDispositivoGB}${nav.ramDispositivoGB >= 8 ? '+' : ''} GB` : '—'}
            sub={nav.nucleos ? `${nav.nucleos} núcleos` : undefined} />
          <KpiCard label="Latencia a Supabase" icon={Plug} tone={latencia > 800 ? 'warning' : 'success'}
            value={latencia != null ? `${latencia} ms` : '—'}
            sub={nav.conexion ? `Red: ${nav.conexion}` : undefined} />
        </KpiGrid>
      </div>

      <div className="sys-section">
        <h2>Supabase</h2>
        {error ? (
          <div className="sys-card sys-error">
            {error}
            <code>Si dice que la función no existe, ejecuta SQL/06_ADMIN_METRICAS_SISTEMA.sql en el SQL Editor de Supabase.</code>
          </div>
        ) : !sb ? (
          <div className="sys-card">Cargando métricas…</div>
        ) : (
          <>
            <div className="sys-card">
              <Barra label="Base de datos" usado={sb.db_bytes} limite={LIMITES.dbBytes} />
              <Barra label="Archivos (Storage)" usado={sb.storage_bytes} limite={LIMITES.storageBytes} />
              <Barra label="Usuarios registrados" usado={sb.usuarios_auth} limite={LIMITES.usuarios} formato={(n) => n.toLocaleString('es-CO')} />
              <Barra label="Conexiones abiertas" usado={sb.conexiones} limite={LIMITES.conexiones} formato={(n) => n} />
              <p className="sys-note">
                Límites según el plan gratis; cámbialos en LIMITES (Sistema.jsx) si usas otro plan.
                {' '}{sb.storage_objetos} archivos guardados.
              </p>
            </div>

            <div className="sys-card" style={{ marginTop: 14 }}>
              <h2 style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}><Database size={15} /> Tablas por tamaño</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="sys-table">
                  <thead><tr><th>Tabla</th><th>Filas (aprox.)</th><th>Tamaño</th></tr></thead>
                  <tbody>
                    {sb.tablas.map(t => (
                      <tr key={t.nombre}><td>{t.nombre}</td><td>{t.filas.toLocaleString('es-CO')}</td><td>{fmtBytes(t.bytes)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        <p className="sys-note">
          <Users size={12} style={{ verticalAlign: -2 }} /> La RAM y el CPU del servidor de Supabase no se pueden leer desde la app:
          están en Supabase → Reports → Database.
        </p>
      </div>
    </div>
  )
}

// =============================================================
// src/components/colaboradores/ColaboradorDetalleModal.jsx
// -------------------------------------------------------------
// Centro Integral / Expediente 360° del Colaborador:
// Centraliza Novedades, Procesos Disciplinarios, Vacaciones,
// Productividad y Parqueadero / Vehículos en una interfaz modular con pestañas.
// =============================================================
import { useState } from 'react'
import {
  X, AlertTriangle, Trash2, Calendar, FileText, CheckCircle2,
  Clock, MapPin, Briefcase, User, Phone, Mail, Car, ShieldAlert,
  Award, TrendingUp, Palmtree, ChevronRight, Eye, Paperclip,
  ExternalLink, Loader2, Info, Building2, IdCard
} from 'lucide-react'
import { CONCEPTO_COLORS, normalizarConcepto } from '../../utils/parseExcel'
import { hoyISO } from '../../utils/fecha'
import { evaluarEstadoTemporalAusencia } from '../../utils/diasHabiles'
import {
  avatarColor, initials, formatProductividad, UMBRAL_ALERTA_PD,
  CONCEPTOS_CON_FECHA, PRODUCTIVIDAD_MESES
} from '../../utils/colaboradores'
import { formatoDias, formatoDiasTexto, formatFecha, calcAntiguedad } from '../../utils/vacacionesHelpers'
import { CONCEPTO_MAP, BUCKET_ADJUNTOS, ALERT } from '../../utils/procesosDisciplinariosConstants'
import { obtenerUrlFirmadaAdjunto } from '../../api/procesosDisciplinarios'
import './colaboradores.css'

export default function ColaboradorDetalleModal({ selected, onClose, onDelete }) {
  const [activeTab, setActiveTab] = useState('resumen') // 'resumen' | 'novedades' | 'procesos' | 'vacaciones' | 'productividad' | 'parqueadero'
  const [signedUrlLoading, setSignedUrlLoading] = useState(null)

  const emp = selected.empleado || {}
  const novedadesOrdenadas = [...(selected.novedades || [])].sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
  const conFecha = novedadesOrdenadas.filter(r => r.fecha_inicio)
  const minFecha = conFecha.length ? conFecha[0].fecha_inicio : null
  const maxFechaRow = conFecha.length ? conFecha.reduce((a, b) => (a.fecha_fin || a.fecha_inicio) > (b.fecha_fin || b.fecha_inicio) ? a : b) : null
  const maxFecha = maxFechaRow ? (maxFechaRow.fecha_fin || maxFechaRow.fecha_inicio) : null
  const rangoTotalMs = minFecha && maxFecha ? Math.max(1, new Date(maxFecha) - new Date(minFecha)) : 1
  const [bg, fg] = avatarColor(selected.nombre)
  const hoyISOVal = hoyISO()

  // Antigüedad
  const antig = emp.fecha_ingreso ? calcAntiguedad(emp.fecha_ingreso) : null

  // Procesos disciplinarios
  const procesosList = selected.procesosDisciplinariosList || []
  const tieneAlertaPD = procesosList.length >= UMBRAL_ALERTA_PD

  // Vacaciones
  const vacResumen = selected.vacacionesResumen || { diasCausados: 0, diasTomados: 0, diasPendientes: 0 }
  const vacacionesList = selected.vacacionesList || []
  const vacActiva = selected.vacacionActiva

  // Parqueadero
  const parqueadero = selected.parqueadero
  const parqueaderoList = selected.parqueaderoList || []
  const tieneVehiculoOParq = Boolean(parqueadero || selected.tieneVehiculo)

  // Productividad
  const prodDetalle = selected.productividadDetalle

  // Manejo de descarga / apertura de adjunto firmado en Procesos Disciplinarios
  const handleVerAdjunto = async (archivo) => {
    if (!archivo?.path) return
    setSignedUrlLoading(archivo.path)
    try {
      const { data, error } = await obtenerUrlFirmadaAdjunto(BUCKET_ADJUNTOS, archivo.path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(`No se pudo abrir el archivo adjunto: ${e.message}`)
    } finally {
      setSignedUrlLoading(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 1200 }}>
      <div
        className="modal"
        style={{
          maxWidth: 920,
          width: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn .22s ease',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* ── CABECERA PRINCIPAL ── */}
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0, flex: 1 }}>
            {/* Avatar */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: bg,
              color: fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
              flexShrink: 0,
              border: `2px solid ${fg}35`,
            }}>
              {initials(selected.nombre)}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  {selected.nombre}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: emp.activo !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: emp.activo !== false ? '#10B981' : '#EF4444',
                  border: `1px solid ${emp.activo !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}>
                  {emp.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                </span>
                {selected.episodiosInc >= 2 && (
                  <span style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={11} /> Reincidente
                  </span>
                )}
                {vacActiva?.enVacaciones && (
                  <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Palmtree size={11} /> En vacaciones
                  </span>
                )}
              </div>

              {/* Fila secundaria: Cargo, Dependencia, Documento */}
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {emp.cargo && (
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                    💼 {emp.cargo}
                  </span>
                )}
                <span>
                  📍 {selected.area}
                </span>
                {emp.numero_documento && (
                  <span>
                    🪪 {emp.tipo_documento || 'CC'}: <strong>{emp.numero_documento}</strong>
                  </span>
                )}
                {emp.fecha_ingreso && (
                  <span>
                    📅 Ingreso: {formatFecha(emp.fecha_ingreso)} {antig?.texto ? `(${antig.texto})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── BARRA DE PESTAÑAS (TABS) ── */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '8px 20px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          {[
            { id: 'resumen', label: '📌 Resumen 360°' },
            { id: 'novedades', label: `🏥 Novedades (${selected.novedades?.length || 0})` },
            { id: 'procesos', label: `📋 Procesos (${procesosList.length})`, badgeAlert: tieneAlertaPD },
            { id: 'vacaciones', label: `🏖️ Vacaciones (${vacacionesList.length})`, badgeSuccess: vacActiva?.enVacaciones },
            { id: 'productividad', label: '📈 Productividad' },
            { id: 'parqueadero', label: `🚗 Parqueadero ${parqueadero ? '✓' : selected.tieneVehiculo ? '•' : ''}` },
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'var(--primary)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(37,99,235,.25)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                {tab.badgeAlert && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                )}
                {tab.badgeSuccess && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── CONTENIDO DE LAS PESTAÑAS ── */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ========================================================= */}
          {/* 1. PESTAÑA: RESUMEN 360°                                  */}
          {/* ========================================================= */}
          {activeTab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Alerta de Procesos Disciplinarios si supera umbral */}
              {tieneAlertaPD && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: ALERT.bg, border: `1px solid ${ALERT.border}`,
                  borderRadius: 10, padding: '10px 14px', color: ALERT.text, fontSize: 13, fontWeight: 600,
                }}>
                  <AlertTriangle size={18} />
                  <span>
                    Atención: Este colaborador tiene <strong>{procesosList.length} procesos disciplinarios</strong> registrados (supera el umbral de alerta de {UMBRAL_ALERTA_PD}).
                  </span>
                </div>
              )}

              {/* Grid de 5 Pilares Informativos (Clickeables para ir a la pestaña) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {/* 1. Novedades */}
                <div
                  onClick={() => setActiveTab('novedades')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'all .15s ease', display: 'flex', flexDirection: 'column',
                  }}
                  className="col-kpi"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--info-text)' }}>🏥 Novedades</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', lineHeight: 1.1 }}>
                    {selected.novedades?.length || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {selected.diasInc.toFixed(0)}d inc. · {selected.episodiosInc} ep.
                  </div>
                  <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2, fontWeight: 600 }}>
                    Tasa ausent: {selected.tasaAusentismo.toFixed(1)}%
                  </div>
                </div>

                {/* 2. Procesos Disciplinarios */}
                <div
                  onClick={() => setActiveTab('procesos')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'all .15s ease', display: 'flex', flexDirection: 'column',
                  }}
                  className="col-kpi"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: tieneAlertaPD ? 'var(--danger-text)' : 'var(--text)' }}>
                      📋 Procesos
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: tieneAlertaPD ? '#DC2626' : procesosList.length > 0 ? '#D97706' : '#10B981', lineHeight: 1.1 }}>
                    {procesosList.length}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {procesosList.length === 0 ? 'Sin sanciones' : `${procesosList.length} falta(s) reg.`}
                  </div>
                  {procesosList.length > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Último: {procesosList[0].concepto}
                    </div>
                  )}
                </div>

                {/* 3. Vacaciones */}
                <div
                  onClick={() => setActiveTab('vacaciones')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'all .15s ease', display: 'flex', flexDirection: 'column',
                  }}
                  className="col-kpi"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>🏖️ Vacaciones</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488', lineHeight: 1.1 }}>
                    {vacResumen.diasPendientes.toFixed(0)}d
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Saldo pendiente
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {vacActiva?.enVacaciones ? '🟢 Disfrutando hoy' : `${vacResumen.diasTomados.toFixed(0)}d tomados`}
                  </div>
                </div>

                {/* 4. Productividad */}
                <div
                  onClick={() => setActiveTab('productividad')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'all .15s ease', display: 'flex', flexDirection: 'column',
                  }}
                  className="col-kpi"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)' }}>📈 Productividad</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
                    {selected.productividad != null ? formatProductividad(selected.productividad, selected.productividadCfg) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {selected.productividadCfg?.label || 'Sin meta'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selected.productividadPeriodo || 'Anual'}
                  </div>
                </div>

                {/* 5. Parqueadero */}
                <div
                  onClick={() => setActiveTab('parqueadero')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'all .15s ease', display: 'flex', flexDirection: 'column',
                  }}
                  className="col-kpi"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>🚗 Parqueadero</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#4F46E5', lineHeight: 1.1, fontFamily: parqueadero?.placa ? 'monospace' : 'inherit' }}>
                    {parqueadero ? parqueadero.placa : selected.tieneVehiculo ? 'Vehículo' : 'Sin cupo'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {parqueadero ? `${parqueadero.tipo || 'Vehículo'} · ${parqueadero.retirado ? 'Retirado' : 'Activo'}` : selected.tieneVehiculo ? 'Tiene vehículo reg.' : 'No registrado'}
                  </div>
                  {parqueadero?.observacion && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {parqueadero.observacion}
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha Institucional y Datos Laborales del Empleado */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={16} style={{ color: 'var(--primary)' }} /> Datos Laborales e Institucionales
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 20px' }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Nombre Completo</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>{selected.nombre}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Cargo Oficial</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>{emp.cargo || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Dependencia / Área</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>{selected.area || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Documento de Identidad</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                      {emp.tipo_documento || 'CC'} {emp.numero_documento || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Fecha de Ingreso</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                      {emp.fecha_ingreso ? formatFecha(emp.fecha_ingreso) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Antigüedad Laboral</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                      {antig?.texto || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Teléfono / Celular</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                      {emp.celular || parqueadero?.telefono || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Correo Electrónico</span>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>{emp.email || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. PESTAÑA: NOVEDADES Y AUSENTISMO                        */}
          {/* ========================================================= */}
          {activeTab === 'novedades' && (
            <div>
              {selected.sinNovedades || selected.novedades?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <CheckCircle2 size={32} style={{ color: '#10B981', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Sin novedades registradas</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Este colaborador no tiene novedades ni ausencias en el sistema.</p>
                </div>
              ) : (
                <>
                  {/* KPIs de ausentismo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
                    <div style={{ background: 'var(--info-bg)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{selected.novedades.length}</div>
                      <div style={{ fontSize: 12, color: 'var(--info-text)', fontWeight: 600 }}>Total novedades</div>
                    </div>
                    <div style={{ background: 'var(--warning-bg)', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>{selected.diasAusenteTotal.toFixed(0)}</div>
                      <div style={{ fontSize: 12, color: 'var(--warning-text)', fontWeight: 600 }}>Días ausente (total)</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sin vacaciones</div>
                    </div>
                    <div
                      title={selected.periodoInicio ? `Período: ${selected.periodoInicio} a ${selected.periodoFin} (${selected.diasPeriodo} días)` : ''}
                      style={{ background: '#E0F2FE', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>{selected.tasaAusentismo.toFixed(1)}%</div>
                      <div style={{ fontSize: 12, color: '#0369A1', fontWeight: 600 }}>Tasa de ausentismo</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sobre días del período</div>
                    </div>
                    {CONCEPTOS_CON_FECHA.filter(c => selected.porConcepto[c]).map(concepto => {
                      const data = selected.porConcepto[concepto]
                      const color = CONCEPTO_COLORS[concepto] || '#374151'
                      return (
                        <div key={concepto} style={{ background: color + '10', border: `1px solid ${color}35`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color }}>{data.episodios}</div>
                          <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>{concepto}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.dias.toFixed(0)} día{data.dias !== 1 ? 's' : ''}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Línea de tiempo visual */}
                  {conFecha.length > 0 && (
                    <div style={{ marginBottom: 18, background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                        Línea de tiempo cronológica
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>{minFecha}</span><span>{maxFecha}</span>
                      </div>
                      <div style={{ position: 'relative', height: 26, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {conFecha.map(r => {
                          const ini = new Date(r.fecha_inicio)
                          const fin = new Date(r.fecha_fin || r.fecha_inicio)
                          const left = ((ini - new Date(minFecha)) / rangoTotalMs) * 100
                          const width = Math.max(1.2, ((fin - ini) / rangoTotalMs) * 100)
                          const color = CONCEPTO_COLORS[normalizarConcepto(r.concepto)] || '#374151'
                          return (
                            <div
                              key={r.id}
                              title={`${r.concepto}: ${r.fecha_inicio} → ${r.fecha_fin || r.fecha_inicio} (${r.total_dias || 1}d)`}
                              style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 3, height: 20, background: color, borderRadius: 4, opacity: .88 }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tabla completa de novedades */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Listado de todas las novedades ({selected.novedades.length})</span>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>F. Inicio</th>
                          <th>F. Fin</th>
                          <th>Días</th>
                          <th>Estado</th>
                          <th>Periodo</th>
                          <th>Observaciones</th>
                          {onDelete && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...selected.novedades].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(r => {
                          const tipo = normalizarConcepto(r.concepto)
                          const color = CONCEPTO_COLORS[tipo] || '#374151'
                          const estadoTemp = evaluarEstadoTemporalAusencia(r, hoyISOVal)
                          const badgeClass =
                            estadoTemp?.badgeTipo === 'activa' ? 'db-badge-activa' :
                            estadoTemp?.badgeTipo === 'reincorporacion' ? 'db-badge-reincorporacion' :
                            estadoTemp?.badgeTipo === 'finalizada' ? 'db-badge-finalizada' :
                            'db-badge-programada'

                          return (
                            <tr key={r.id}>
                              <td><span className="badge tag-c" style={{ '--tag': color }}>{r.concepto}</span></td>
                              <td>{r.fecha_inicio || '—'}</td>
                              <td>{r.fecha_fin || '—'}</td>
                              <td><strong>{r.total_dias ?? '—'}</strong></td>
                              <td>
                                {!r.fecha_inicio || !estadoTemp ? (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                ) : (
                                  <span className={badgeClass} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                                    {estadoTemp.badgeTexto}
                                  </span>
                                )}
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>{r.periodo || '—'}</td>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }} title={r.observacion || ''}>
                                {r.observacion || '—'}
                              </td>
                              {onDelete && (
                                <td>
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'none' }}
                                    onClick={() => onDelete(r.id)}
                                    title="Eliminar registro"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. PESTAÑA: PROCESOS DISCIPLINARIOS                       */}
          {/* ========================================================= */}
          {activeTab === 'procesos' && (
            <div>
              {procesosList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <CheckCircle2 size={32} style={{ color: '#10B981', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Sin procesos disciplinarios</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Excelente: Este colaborador no cuenta con faltas, sanciones ni procesos abiertos.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tieneAlertaPD && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: ALERT.bg, border: `1px solid ${ALERT.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: ALERT.text, fontWeight: 600 }}>
                      <AlertTriangle size={15} /> Este empleado supera el umbral de alerta ({UMBRAL_ALERTA_PD} procesos disciplinarios).
                    </div>
                  )}

                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    Historial de Procesos ({procesosList.length})
                  </div>

                  {procesosList.map((p, idx) => {
                    const meta = CONCEPTO_MAP[p.concepto] || { icon: '📄', color: '#DC2626' }
                    return (
                      <div
                        key={p.id || idx}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px 16px',
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: `${meta.color || '#DC2626'}15`,
                            color: meta.color || '#DC2626',
                            fontWeight: 700,
                            fontSize: 12,
                            border: `1px solid ${meta.color || '#DC2626'}30`,
                          }}>
                            {meta.icon} {meta.label || p.concepto}
                          </span>

                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                            📅 {p.fecha || (p.fecha_inicio ? `${p.fecha_inicio} → ${p.fecha_fin}` : '—')} {p.hora ? `· ⏰ ${p.hora}` : ''}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          🏢 Dependencia: <strong>{p.departamento || selected.area}</strong>
                        </div>

                        {p.observacion && (
                          <div style={{
                            marginTop: 8,
                            fontSize: 12.5,
                            color: 'var(--text)',
                            background: 'var(--bg)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {p.observacion}
                          </div>
                        )}

                        {/* Adjuntos del proceso */}
                        {Array.isArray(p.archivos) && p.archivos.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {p.archivos.map((a, aIdx) => (
                              <button
                                key={a.path || aIdx}
                                type="button"
                                onClick={() => handleVerAdjunto(a)}
                                disabled={signedUrlLoading === a.path}
                                className="btn btn-ghost"
                                style={{
                                  fontSize: 11.5,
                                  padding: '4px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {signedUrlLoading === a.path ? (
                                  <Loader2 size={12} className="spin" />
                                ) : (
                                  <Paperclip size={12} />
                                )}
                                <span>{a.nombre || 'Ver PDF adjunto'}</span>
                                <ExternalLink size={10} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. PESTAÑA: VACACIONES                                    */}
          {/* ========================================================= */}
          {activeTab === 'vacaciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Banner si está en vacaciones actualmente */}
              {vacActiva?.enVacaciones && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#E0F2FE', border: '1px solid #BAE6FD',
                  borderRadius: 10, padding: '12px 16px', color: '#0369A1', fontSize: 13, fontWeight: 600,
                }}>
                  <Palmtree size={20} />
                  <div>
                    <div>Colaborador actualmente en período de vacaciones</div>
                    <div style={{ fontSize: 11.5, fontWeight: 400, marginTop: 2 }}>
                      Período: {vacActiva.fechaInicio || '—'} hasta {vacActiva.fechaFin || '—'}
                      {vacActiva.fechaRegreso ? ` · Regreso previsto: ${vacActiva.fechaRegreso}` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Panel de Saldos de Vacaciones */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{vacResumen.diasCausados.toFixed(1)}d</div>
                  <div style={{ fontSize: 12, color: '#065F46', fontWeight: 700 }}>Días Causados por Ley</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {emp.fecha_ingreso ? `Calculado desde ${formatFecha(emp.fecha_ingreso)}` : 'Fecha ingreso no asignada'}
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB' }}>{vacResumen.diasTomados.toFixed(1)}d</div>
                  <div style={{ fontSize: 12, color: '#1E40AF', fontWeight: 700 }}>Días Disfrutados / Pagados</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    En solicitudes aprobadas o finalizadas
                  </div>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706' }}>{vacResumen.diasPendientes.toFixed(1)}d</div>
                  <div style={{ fontSize: 12, color: '#92400E', fontWeight: 700 }}>Saldo Pendiente Disponible</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Días hábiles disponibles por disfrutar
                  </div>
                </div>
              </div>

              {/* Historial de Solicitudes */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Historial de Períodos y Solicitudes de Vacaciones ({vacacionesList.length})
                </div>

                {vacacionesList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)', fontSize: 12.5, color: 'var(--text-muted)' }}>
                    No hay solicitudes registradas formalmente en el módulo de Vacaciones.
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Período</th>
                          <th>F. Inicio</th>
                          <th>F. Fin</th>
                          <th>Días Hábiles</th>
                          <th>Fecha Regreso</th>
                          <th>Estado</th>
                          <th>Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vacacionesList.map((v, idx) => (
                          <tr key={v.id || idx}>
                            <td style={{ fontWeight: 600 }}>{v.periodo || '—'}</td>
                            <td>{v.fecha_inicio || '—'}</td>
                            <td>{v.fecha_fin || '—'}</td>
                            <td><strong>{v.dias_habiles || v.total_dias || '—'}d</strong></td>
                            <td>{v.fecha_reintegro || v.fecha_regreso || '—'}</td>
                            <td>
                              <span style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: v.estado === 'Aprobada' ? 'rgba(16, 185, 129, 0.12)' : v.estado === 'En curso' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                                color: v.estado === 'Aprobada' ? '#10B981' : v.estado === 'En curso' ? '#2563EB' : 'var(--text-muted)',
                              }}>
                                {v.estado || 'Registrada'}
                              </span>
                            </td>
                            <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                              {v.observacion || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. PESTAÑA: PRODUCTIVIDAD                                 */}
          {/* ========================================================= */}
          {activeTab === 'productividad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selected.productividad != null ? (
                <>
                  <div style={{
                    background: 'var(--success-bg)', border: '1px solid #BBF7D0', borderRadius: 10,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 700 }}>
                        📈 {prodDetalle?.cfg?.label || selected.productividadCfg?.label || 'Productividad Registrada'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Dependencia: {prodDetalle?.departamento || selected.area} · Período: {selected.productividadPeriodo}
                      </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success-text)' }}>
                      {formatProductividad(selected.productividad, prodDetalle?.cfg || selected.productividadCfg)}
                    </div>
                  </div>

                  {/* Desglose de los 12 meses */}
                  {prodDetalle?.meses && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                        Desglose Mensual ({prodDetalle.anio})
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: 8,
                      }}>
                        {prodDetalle.meses.map(m => (
                          <div
                            key={m.mes}
                            style={{
                              background: m.valor > 0 ? 'var(--surface)' : 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              textAlign: 'center',
                              opacity: m.valor > 0 ? 1 : 0.6,
                            }}
                          >
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{m.mes}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: m.valor > 0 ? 'var(--primary)' : 'var(--text-muted)', marginTop: 2 }}>
                              {formatProductividad(m.valor, prodDetalle.cfg)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <TrendingUp size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Sin métricas de productividad</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    No se han registrado producciones, clientes resueltos ni cierres para este colaborador en {selected.area}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. PESTAÑA: PARQUEADERO Y VEHÍCULOS                       */}
          {/* ========================================================= */}
          {activeTab === 'parqueadero' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {parqueadero ? (
                <>
                  {/* Tarjeta destacada de vehículo */}
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: parqueadero.tipo === 'CARRO' ? 'var(--info-bg)' : parqueadero.tipo === 'BICICLETA' ? '#D1FAE5' : 'var(--warning-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                      }}>
                        {parqueadero.tipo === 'CARRO' ? '🚗' : parqueadero.tipo === 'BICICLETA' ? '🚲' : '🏍️'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            background: '#FCD34D',
                            color: '#1E293B',
                            padding: '3px 12px',
                            borderRadius: 6,
                            border: '2px solid #0F172A',
                            boxShadow: '0 2px 4px rgba(0,0,0,.15)',
                          }}>
                            {parqueadero.placa}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: parqueadero.retirado ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
                            color: parqueadero.retirado ? '#EF4444' : '#10B981',
                            border: `1px solid ${parqueadero.retirado ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`,
                          }}>
                            {parqueadero.retirado ? '● RETIRADO' : '✓ ACTIVO EN PARQUEADERO'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          Tipo: <strong>{parqueadero.tipo || 'Vehículo'}</strong> · Período: <strong>{parqueadero.mes} {parqueadero.anio}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 18px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Cédula registrada</span>
                        <strong style={{ fontSize: 13 }}>{parqueadero.cedula || emp.numero_documento || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Teléfono registrado</span>
                        <strong style={{ fontSize: 13 }}>{parqueadero.telefono || emp.celular || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Fecha de ingreso al parqueadero</span>
                        <strong style={{ fontSize: 13 }}>{parqueadero.fecha_ingreso ? formatFecha(parqueadero.fecha_ingreso) : '—'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Fecha de retiro</span>
                        <strong style={{ fontSize: 13 }}>{parqueadero.fecha_retiro ? formatFecha(parqueadero.fecha_retiro) : '—'}</strong>
                      </div>
                      {parqueadero.observacion && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Observaciones del cupo</span>
                          <span style={{
                            display: 'inline-block',
                            marginTop: 3,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: parqueadero.observacion === 'EXENTOS DE PAGO' ? 'rgba(16,185,129,.12)' : 'var(--bg)',
                            color: parqueadero.observacion === 'EXENTOS DE PAGO' ? '#10B981' : 'var(--text)',
                            fontWeight: 600,
                            fontSize: 12,
                          }}>
                            {parqueadero.observacion}
                          </span>
                        </div>
                      )}
                      {parqueadero.nota_vehiculo && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Nota del vehículo</span>
                          <div style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6, marginTop: 3 }}>
                            {parqueadero.nota_vehiculo}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Si tiene historial de registros de parqueadero */}
                  {parqueaderoList.length > 1 && (
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                        Historial de Registros en Parqueadero ({parqueaderoList.length})
                      </div>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Placa</th>
                              <th>Tipo</th>
                              <th>Mes/Año</th>
                              <th>Estado</th>
                              <th>Observación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parqueaderoList.map(p => (
                              <tr key={p.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.placa}</td>
                                <td>{p.tipo}</td>
                                <td>{p.mes} {p.anio}</td>
                                <td>{p.retirado ? 'Retirado' : 'Activo'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.observacion || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : selected.tieneVehiculo ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <Car size={32} style={{ color: '#2563EB', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Vehículo reportado en Ficha de Empleado</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    El colaborador tiene marcado <strong>"Tiene vehículo"</strong> en su ficha de empleado, pero no cuenta con cupo registrado en el módulo de Parqueadero.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <Car size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Sin vehículo ni cupo de parqueadero</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Este colaborador no tiene vehículo ni registros asociados en el parqueadero de la empresa.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── FOOTER DEL MODAL ── */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Centro Integral de Información del Colaborador
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 16px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
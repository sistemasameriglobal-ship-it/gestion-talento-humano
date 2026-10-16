// =============================================================
// src/components/empleados/EmpleadoHistorialModal.jsx
// -------------------------------------------------------------
// Ficha / Expediente Integral del colaborador con bloques
// modulares oscuros + secciones desplegables de Vacaciones,
// Periodos Laborales, Procesos Disciplinarios y Novedades.
// =============================================================
import { useEffect, useRef, useState } from 'react'
import {
  X, Edit2, Award, Scale, Phone, ChevronDown, ChevronUp,
  IdCard, MapPin, ShieldCheck, HeartPulse, Landmark, FileSpreadsheet, Building2,
} from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { CONCEPTOS_CON_FECHA, calcularEdad, formatCOP } from './empleadosConstants'
import {
  formatFecha, calcAntiguedadEmpleado,
  getEstadoVacacionActual, obtenerPeriodosVacacionesEmpleado
} from '../../utils/vacacionesHelpers'
import { hoyISO } from '../../utils/fecha'
import { evaluarEstadoTemporalAusencia } from '../../utils/diasHabiles'
import './empleados.css'

function inicialesNombre(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '—'
  const clean = String(fechaISO).trim().slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return clean
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function DataRow({ label, value, badge, badgeColor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      {badge ? (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
          background: badgeColor?.bg || 'rgba(239, 68, 68, 0.18)',
          color: badgeColor?.text || '#FCA5A5',
          border: `1px solid ${badgeColor?.border || 'rgba(239, 68, 68, 0.35)'}`,
        }}>
          {value || '—'}
        </span>
      ) : (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>
          {value || '—'}
        </span>
      )}
    </div>
  )
}

export default function EmpleadoHistorialModal({
  selectedEmp,
  novedadesPorEmpleado,
  periodos = [],
  vacaciones = [],
  procesos = [],
  initialSection = null,
  onClose,
  onEdit,
  onReintegrar,
  onLiquidar,
  onSustitucion,
}) {
  const { currentCompany } = useCompany()
  const nombreEmpresaActiva = currentCompany === 'global_link' ? 'Global Link' : 'AmeriGlobal'
  const nov = novedadesPorEmpleado[selectedEmp.nombre_completo]
  const procesosRef = useRef(null)

  const [openSections, setOpenSections] = useState({
    vacaciones: true,
    procesos: initialSection === 'procesos' || (procesos && procesos.length > 0),
  })
  const [activeHistoryTab, setActiveHistoryTab] = useState('periodos')

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (initialSection === 'procesos') {
      const t = setTimeout(() => {
        procesosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return () => clearTimeout(t)
    }
  }, [initialSection])

  // Si no hay lista de periodos de la BD, armar periodo base con los datos del empleado
  const listaPeriodos = (periodos && periodos.length > 0)
    ? periodos
    : (selectedEmp.fecha_ingreso ? [{
        id: 'base',
        numero_periodo: 1,
        fecha_ingreso: selectedEmp.fecha_ingreso,
        fecha_retiro: selectedEmp.fecha_retiro,
        cargo: selectedEmp.cargo,
        dependencia: selectedEmp.dependencia,
        es_periodo_actual: selectedEmp.activo !== false,
        observaciones: 'Periodo inicial registrado'
      }] : [])

  const periodoActivo = listaPeriodos.find(p => p.es_periodo_actual) || listaPeriodos[listaPeriodos.length - 1] || (selectedEmp.fecha_ingreso ? { id: 'base', fecha_ingreso: selectedEmp.fecha_ingreso, es_periodo_actual: true } : null)
  const periodosVacaciones = obtenerPeriodosVacacionesEmpleado(selectedEmp, vacaciones, listaPeriodos)
  const vacacionActiva = getEstadoVacacionActual(selectedEmp, vacaciones, nov?.novedades)
  const antig = calcAntiguedadEmpleado(selectedEmp, listaPeriodos)

  const ultimoPeriodoCerrado = [...listaPeriodos].reverse().find(p => !p.es_periodo_actual) || null
  const estaLiquidado = Boolean(selectedEmp.liquidado || ultimoPeriodoCerrado?.liquidado)
  const fechaLiq = selectedEmp.fecha_liquidacion || ultimoPeriodoCerrado?.fecha_liquidacion || null
  const obsLiq = selectedEmp.observacion_liquidacion || ultimoPeriodoCerrado?.observacion_liquidacion || ''

  // Fechas contractuales y edad
  const fechaInicioActual = selectedEmp.fecha_inicio_empresa_actual || periodoActivo?.fecha_ingreso || selectedEmp.fecha_ingreso || ''
  const fechaPrimerIngreso = selectedEmp.fecha_primer_ingreso || ''
  const fechaTerminacionAnterior = selectedEmp.fecha_terminacion_anterior || ''
  const tieneHistorialPrevio = Boolean(fechaPrimerIngreso || fechaTerminacionAnterior)

  const edad = calcularEdad(selectedEmp.fecha_nacimiento)
  const contactosEmergencia = Array.isArray(selectedEmp.contactos_emergencia)
    ? selectedEmp.contactos_emergencia.filter(c => c && (c.nombre || c.telefono))
    : []

  const labelTipoDoc = {
    CC: 'Cédula (CC)',
    PEP: 'PEP',
    PPT: 'PPT',
    CE: 'Cédula Extranjería',
    Pasaporte: 'Pasaporte',
  }[selectedEmp.tipo_documento] || (selectedEmp.tipo_documento || 'Documento')

  return (
    <div className="modal-backdrop emp-modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="modal emp-modal-box"
        style={{
          maxWidth: 840,
          width: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── 1. CABECERA PRINCIPAL ── */}
        <div className="emp-modal-hdr" style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            {/* Avatar circular */}
            <div className="emp-avatar-accent" style={{
              borderRadius: '50%',
              fontSize: 17,
            }}>
              {inicialesNombre(selectedEmp.nombre_completo)}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {selectedEmp.nombre_completo}
                </h2>
                <span className={`emp-badge ${selectedEmp.activo === false ? 'emp-badge--inactivo' : 'emp-badge--activo'}`}>
                  {selectedEmp.activo === false ? 'Inactivo' : 'Activo'}
                </span>

                {selectedEmp.activo === false && (
                  estaLiquidado ? (
                    <span
                      onClick={() => { if (onLiquidar) { onClose(); onLiquidar(selectedEmp) } }}
                      title={obsLiq ? `Observaciones: ${obsLiq}` : 'Liquidación registrada'}
                      className="emp-badge emp-badge--liquidado"
                      style={{ cursor: onLiquidar ? 'pointer' : 'default' }}
                    >
                      ✓ Liquidado: {fechaLiq ? String(fechaLiq).slice(0, 10) : 'Sí'}
                    </span>
                  ) : (
                    <span
                      onClick={() => { if (onLiquidar) { onClose(); onLiquidar(selectedEmp) } }}
                      className="emp-badge emp-badge--pendiente-liq"
                      style={{ cursor: onLiquidar ? 'pointer' : 'default' }}
                    >
                      ⚠️ Pendiente por liquidar {onLiquidar && <span className="emp-badge-liq-link">• Liquidar</span>}
                    </span>
                  )
                )}
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                {[
                  selectedEmp.cargo || selectedEmp.dependencia || 'Colaborador',
                  selectedEmp.dependencia && selectedEmp.cargo ? selectedEmp.dependencia : null,
                  fechaInicioActual ? `Contrato desde: ${formatDDMMYYYY(fechaInicioActual)}` : null,
                  antig?.texto ? `Antigüedad: ${antig.texto}` : null,
                ].filter(Boolean).join(' • ')}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="emp-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY CON SCROLL SUAVE ── */}
        <div
          className="modal-body"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 24px',
          }}
        >

          {/* ── 2. KPI CARDS SUPERIORES (4 TARJETAS EN FILA) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 16,
          }}>
            <div className="emp-kpi-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Salario</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>
                {Number(selectedEmp.salario) > 0 ? formatCOP(selectedEmp.salario) : '—'}
              </div>
            </div>

            <div className="emp-kpi-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Aux. transporte</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>
                {Number(selectedEmp.auxilio_transporte) > 0 ? formatCOP(selectedEmp.auxilio_transporte) : '—'}
              </div>
            </div>

            <div className="emp-kpi-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ingreso</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {formatDDMMYYYY(fechaInicioActual)}
              </div>
            </div>

            <div className="emp-kpi-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Edad</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>
                {edad !== null ? `${edad} años` : '—'}
              </div>
            </div>
          </div>

          {/* ── 3. GRILLA DE BLOQUES MODULARES (2 COLUMNAS) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 12,
            marginBottom: 18,
          }}>
            {/* Bloque 1: Identificación */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IdCard size={13} style={{ color: '#38BDF8' }} /> Identificación
              </div>
              <DataRow label={labelTipoDoc} value={selectedEmp.numero_documento || '—'} />
              <DataRow label="Fecha de nacimiento" value={formatDDMMYYYY(selectedEmp.fecha_nacimiento)} />
              <DataRow
                label="Tipo de sangre"
                value={selectedEmp.tipo_sangre || '—'}
                badge={Boolean(selectedEmp.tipo_sangre)}
              />
            </div>

            {/* Bloque 2: Contacto */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} style={{ color: '#34D399' }} /> Contacto
              </div>
              <DataRow label="Celular" value={selectedEmp.celular || '—'} />
              <DataRow label="Correo personal" value={selectedEmp.correo_personal || '—'} />
              <DataRow label="Correo empresarial" value={selectedEmp.correo || '—'} />
              <DataRow label="Dirección" value={selectedEmp.direccion || '—'} />
              <DataRow
                label="Barrio / Municipio"
                value={[selectedEmp.barrio, selectedEmp.municipio].filter(Boolean).join(' • ') || '—'}
              />
            </div>

            {/* Bloque 3: Seguridad Social */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={13} style={{ color: '#60A5FA' }} /> Seguridad Social
              </div>
              <DataRow label="EPS" value={selectedEmp.eps || '—'} />
              <DataRow label="Pensión" value={selectedEmp.pension || '—'} />
              <DataRow label="Cesantías" value={selectedEmp.cesantias || '—'} />
            </div>

            {/* Bloque 4: En caso de emergencia */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HeartPulse size={13} style={{ color: '#F87171' }} /> En caso de emergencia
              </div>
              {contactosEmergencia.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                  Sin contactos de emergencia registrados.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contactosEmergencia.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 10,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(245, 158, 11, 0.18)', color: '#FBBF24',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Phone size={13} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{c.nombre || 'Contacto'}</span>
                          {c.parentesco && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                              ({c.parentesco})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {c.telefono || 'Sin teléfono'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloque 5: Datos bancarios */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Landmark size={13} style={{ color: '#A78BFA' }} /> Datos bancarios
              </div>
              <DataRow label="Banco" value={selectedEmp.banco || '—'} />
              <DataRow label="Tipo de cuenta" value={selectedEmp.tipo_cuenta || '—'} />
              <DataRow label="Número de cuenta" value={selectedEmp.numero_cuenta || '—'} />
            </div>

            {/* Bloque 6: Historial de contrato */}
            <div className="emp-block-card">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={13} style={{ color: '#FBBF24' }} /> Historial de contrato
              </div>
              {tieneHistorialPrevio && (
                <>
                  <DataRow label="Primer ingreso" value={formatDDMMYYYY(fechaPrimerIngreso)} />
                  <DataRow label="Fecha de terminación anterior" value={formatDDMMYYYY(fechaTerminacionAnterior)} />
                </>
              )}
              <DataRow label={`Inicio en ${nombreEmpresaActiva}`} value={formatDDMMYYYY(fechaInicioActual)} />
            </div>
          </div>

          {/* ── 4. BLOQUES INFERIORES: VACACIONES, PROCESOS Y PESTAÑAS DE PERIODOS / NOVEDADES ── */}

          {/* 4A. Vacaciones y Saldo Disponible */}
          <div className="emp-hist-accordion">
            <button
              type="button"
              onClick={() => toggleSection('vacaciones')}
              className="emp-hist-accordion-hdr"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>🌴</span>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Vacaciones y Saldo Disponible ({periodosVacaciones.saldoTotal}d disponibles)
                </span>
                {vacacionActiva && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(56, 189, 248, 0.2)', color: '#7DD3FC',
                  }}>
                    {vacacionActiva.countdownTexto}
                  </span>
                )}
              </div>
              {openSections.vacaciones ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openSections.vacaciones && (
              <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                {/* Resumen General Superior */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px', marginTop: 12, marginBottom: 14,
                  flexWrap: 'wrap', gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Saldo Total Acumulado
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: periodosVacaciones.saldoTotal > 0 ? '#10B981' : 'var(--text)' }}>
                      {periodosVacaciones.saldoTotal} {periodosVacaciones.saldoTotal === 1 ? 'día disponible' : 'días disponibles'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Total Causados</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{periodosVacaciones.totalCausados}d</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Total Disfrutados</div>
                      <div style={{ fontWeight: 700, color: '#10B981' }}>{periodosVacaciones.totalDisfrutados}d</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Total En Dinero</div>
                      <div style={{ fontWeight: 700, color: '#EAB308' }}>{periodosVacaciones.totalEnDinero}d</div>
                    </div>
                    {periodosVacaciones.totalAjusteManual > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ajuste Histórico</div>
                        <div style={{ fontWeight: 700, color: '#F97316' }}>{periodosVacaciones.totalAjusteManual}d</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Períodos Anuales Independientes */}
                {periodosVacaciones.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                    El colaborador no registra fecha de ingreso contractual para calcular sus periodos de vacaciones.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {periodosVacaciones.map((c) => (
                      <div
                        key={c.etiqueta}
                        style={{
                          background: 'var(--bg)',
                          border: c.saldo_restante > 0 ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '12px 14px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Cabecera del período */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🌴</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '.02em' }}>
                                  PERÍODO {c.etiquetaVisual}
                                </span>
                                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                                  ({c.subtitulo})
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {formatFecha(c.fecha_inicio_ciclo)} → {formatFecha(c.fecha_fin_ciclo)}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '3px 12px',
                            borderRadius: 999,
                            background: c.saldo_restante > 0 ? 'rgba(16, 185, 129, 0.16)' : 'var(--surface)',
                            color: c.saldo_restante > 0 ? '#10B981' : 'var(--text-muted)',
                            border: `1px solid ${c.saldo_restante > 0 ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)'}`,
                          }}>
                            Saldo: {c.saldo_restante} {c.saldo_restante === 1 ? 'día' : 'días'}
                          </span>
                        </div>

                        {/* Mini KPIs del período */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6, marginBottom: 10 }}>
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{c.dias_causados}d</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Causados</div>
                          </div>
                          <div style={{ background: 'var(--surface)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{c.dias_disfrutados}d</div>
                            <div style={{ fontSize: 10, color: '#059669' }}>Disfrutados</div>
                          </div>
                          <div style={{ background: 'var(--surface)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#EAB308' }}>{c.dias_en_dinero}d</div>
                            <div style={{ fontSize: 10, color: '#CA8A04' }}>En dinero</div>
                          </div>
                          {c.dias_ajuste_manual > 0 && (
                            <div style={{ background: 'var(--surface)', border: '1px solid rgba(249, 115, 22, 0.35)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#FB923C' }}>{c.dias_ajuste_manual}d</div>
                              <div style={{ fontSize: 10, color: '#F97316' }}>Ajuste manual</div>
                            </div>
                          )}
                          <div style={{ background: 'var(--surface)', border: `1px solid ${c.saldo_restante > 0 ? 'rgba(16, 185, 129, 0.45)' : 'var(--border)'}`, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: c.saldo_restante > 0 ? '#10B981' : 'var(--text-muted)' }}>{c.saldo_restante}d</div>
                            <div style={{ fontSize: 10, color: c.saldo_restante > 0 ? '#059669' : 'var(--text-muted)' }}>Restantes</div>
                          </div>
                        </div>

                        {/* Solicitudes de este período */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                          {c.solicitudes && c.solicitudes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                Solicitudes de este período:
                              </div>
                              {c.solicitudes.map((v, vIdx) => {
                                const estado = v.estado || 'Pendiente'
                                const esOk = estado === 'Aprobada' || estado === 'Disfrutadas' || estado === 'Finalizada'
                                return (
                                  <div
                                    key={v.id || vIdx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: 8,
                                      background: 'var(--surface)',
                                      borderRadius: 8,
                                      padding: '6px 10px',
                                      border: '1px solid var(--border)',
                                      fontSize: 12,
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                        {v.fecha_inicio ? `📅 ${formatFecha(v.fecha_inicio)} → ${v.fecha_fin ? formatFecha(v.fecha_fin) : '—'}` : '💰 Sin fecha (compensación)'}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                        ({v.dias_tiempo_calc || 0}d tiempo{v.dias_dinero_calc ? ` + ${v.dias_dinero_calc}d dinero` : ''})
                                      </span>
                                      {(v.observacion_contable || v.observacion) && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          • {v.observacion_contable || v.observacion}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
                                      background: esOk ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                                      color: esOk ? '#10B981' : '#F59E0B',
                                      border: `1px solid ${esOk ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                                    }}>
                                      {estado}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 0' }}>
                              Sin solicitudes en este período.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4B. Procesos Disciplinarios */}
          {(procesos.length > 0 || initialSection === 'procesos') && (
            <div
              ref={procesosRef}
              className="emp-hist-accordion"
              style={{
                border: initialSection === 'procesos' ? '1.5px solid #F59E0B' : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('procesos')}
                className="emp-hist-accordion-hdr"
                style={{ color: '#F59E0B' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <Scale size={14} /> Procesos Disciplinarios ({procesos.length})
                </span>
                {openSections.procesos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {openSections.procesos && (
                <div style={{ padding: '12px 16px 14px', borderTop: '1px solid var(--border)' }}>
                  {procesos.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>
                      No registra procesos disciplinarios.
                    </div>
                  ) : (
                    <div className="emp-hist-table-wrap">
                      <table className="emp-hist-table">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Fecha</th>
                            <th>Motivo / Observación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {procesos.map(p => {
                            const fEvento = p.fecha
                              ? String(p.fecha).slice(0, 10)
                              : p.fecha_inicio
                                ? (p.fecha_fin && p.fecha_fin !== p.fecha_inicio
                                    ? `${String(p.fecha_inicio).slice(0, 10)} → ${String(p.fecha_fin).slice(0, 10)}`
                                    : String(p.fecha_inicio).slice(0, 10))
                                : (p.created_at ? String(p.created_at).slice(0, 10) : '—')
                            return (
                              <tr key={p.id}>
                                <td style={{ fontWeight: 700, color: '#F59E0B', whiteSpace: 'nowrap' }}>
                                  {p.concepto}
                                </td>
                                <td className="emp-hist-cell-date">
                                  {fEvento}{p.hora ? ` (${String(p.hora).slice(0, 5)})` : ''}
                                </td>
                                <td style={{ color: 'var(--text)' }}>
                                  {p.observacion || '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4C. Pestañas Conmutables: Periodos Laborales e Historial de Novedades */}
          <div className="emp-hist-accordion" style={{ marginBottom: 0 }}>
            <div className="emp-hist-tabs-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('periodos')}
                  className={`emp-hist-tab-btn ${activeHistoryTab === 'periodos' ? 'active' : ''}`}
                >
                  <span>📜</span>
                  <span>Periodos Laborales</span>
                  <span className="emp-hist-tab-count">{listaPeriodos.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('novedades')}
                  className={`emp-hist-tab-btn ${activeHistoryTab === 'novedades' ? 'active' : ''}`}
                >
                  <span>📋</span>
                  <span>Historial de Novedades</span>
                  <span className="emp-hist-tab-count">{nov ? nov.novedades.length : 0}</span>
                </button>
              </div>

              {onReintegrar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onReintegrar(selectedEmp)
                  }}
                  className="emp-hist-action-btn"
                >
                  <Award size={13} /> Registrar Ascenso / Movimiento
                </button>
              )}
            </div>

            <div style={{ padding: '14px 16px' }}>
              {activeHistoryTab === 'periodos' ? (
                <div className="emp-hist-table-wrap">
                  <table className="emp-hist-table">
                    <thead>
                      <tr>
                        <th>Periodo</th>
                        <th>Ingreso</th>
                        <th>Retiro</th>
                        <th>Área / Cargo</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                        <th>Detalles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaPeriodos.map(p => (
                        <tr key={p.id || p.numero_periodo}>
                          <td>
                            <span className="emp-hist-period-badge">#{p.numero_periodo}</span>
                          </td>
                          <td className="emp-hist-cell-date">{p.fecha_ingreso || '—'}</td>
                          <td className="emp-hist-cell-date" style={{ color: p.fecha_retiro ? '#EF4444' : undefined }}>
                            {p.fecha_retiro || '—'}
                          </td>
                          <td style={{ color: 'var(--text)' }}>
                            {[p.dependencia, p.cargo].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: p.es_periodo_actual ? 'rgba(16, 185, 129, 0.16)' : 'rgba(148, 163, 184, 0.14)',
                              color: p.es_periodo_actual ? '#10B981' : 'var(--text-muted)',
                              border: `1px solid ${p.es_periodo_actual ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.28)'}`,
                            }}>
                              {p.es_periodo_actual ? 'Vigente' : 'Cerrado'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {p.observaciones || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !nov || nov.novedades.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 0' }}>
                    Este empleado no tiene novedades registradas.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--secondary)' }}>{nov.novedades.length}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total novedades</div>
                      </div>
                      {CONCEPTOS_CON_FECHA.filter(c => nov.porConcepto[c]).map(concepto => {
                        const data = nov.porConcepto[concepto]
                        const color = CONCEPTO_COLORS[concepto] || '#60A5FA'
                        return (
                          <div key={concepto} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color }}>{data.episodios}</div>
                            <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{concepto}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{data.dias.toFixed(0)} día{data.dias !== 1 ? 's' : ''}</div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="emp-hist-table-wrap">
                      <table className="emp-hist-table">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>F. Inicio</th>
                            <th>F. Fin</th>
                            <th style={{ textAlign: 'center' }}>Días</th>
                            <th style={{ textAlign: 'center' }}>Estado</th>
                            <th>Periodo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...nov.novedades].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(r => {
                            const tipo = normalizarConcepto(r.concepto)
                            const color = CONCEPTO_COLORS[tipo] || '#60A5FA'
                            const estadoTemp = evaluarEstadoTemporalAusencia(r, hoyISO())
                            const badgeClass =
                              estadoTemp?.badgeTipo === 'activa' ? 'db-badge-activa' :
                              estadoTemp?.badgeTipo === 'reincorporacion' ? 'db-badge-reincorporacion' :
                              estadoTemp?.badgeTipo === 'finalizada' ? 'db-badge-finalizada' :
                              'db-badge-programada'

                            return (
                              <tr key={r.id}>
                                <td>
                                  <span className="emp-concept-tag" style={{ '--tag': color }}>
                                    {r.concepto}
                                  </span>
                                </td>
                                <td className="emp-hist-cell-date">{r.fecha_inicio || '—'}</td>
                                <td className="emp-hist-cell-date">{r.fecha_fin || '—'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.total_dias ?? '—'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {estadoTemp ? (
                                    <span className={badgeClass} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                                      {estadoTemp.badgeTexto}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.periodo || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER FIJO ── */}
        <div
          className="emp-modal-footer"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cerrar
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {onSustitucion && selectedEmp.activo !== false && (
              <button
                className="btn btn-secondary"
                style={{ color: '#4338CA', borderColor: '#C7D2FE', background: '#EEF2FF', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  const emp = selectedEmp
                  onClose()
                  onSustitucion(emp)
                }}
              >
                <Building2 size={14} /> Sustitución Patronal
              </button>
            )}
            <button className="btn btn-primary" onClick={onEdit}>
              <Edit2 size={14} /> Editar expediente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
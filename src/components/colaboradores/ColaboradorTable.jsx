// =============================================================
// src/components/colaboradores/ColaboradorTable.jsx
// -------------------------------------------------------------
// Vista de tabla de colaboradores: Novedades, Procesos Disciplinarios,
// Vacaciones, Productividad y Parqueadero centralizados.
// =============================================================
import { CONCEPTO_COLORS } from '../../utils/parseExcel'
import { avatarColor, initials, formatProductividad, UMBRAL_ALERTA_PD } from '../../utils/colaboradores'
import './colaboradores.css'

export default function ColaboradorTable({ paged, onSelect }) {
  return (
    <div className="table-container" style={{ marginBottom: 20, animation: 'fadeIn .25s ease' }}>
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Área</th>
            <th style={{ textAlign: 'center' }}>Incapacidades</th>
            <th style={{ textAlign: 'center' }}>Días inc.</th>
            <th style={{ textAlign: 'center' }}>Tasa ausent.</th>
            <th style={{ textAlign: 'center' }}>Novedades</th>
            <th style={{ textAlign: 'center' }}>Procesos Disc.</th>
            <th style={{ textAlign: 'center' }}>Vacaciones</th>
            <th style={{ textAlign: 'center' }}>Productividad</th>
            <th style={{ textAlign: 'center' }}>Parqueadero</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((col, idx) => {
            const [bg, fg] = avatarColor(col.nombre)
            return (
              <tr
                key={col.nombre}
                className="col-row"
                style={{ cursor: 'pointer', animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
                onClick={() => onSelect(col)}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, flexShrink: 0 }}>
                      {initials(col.nombre)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', color: 'var(--text)' }}>{col.nombre}</span>
                      {col.empleado?.cargo && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>
                          {col.empleado.cargo}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{col.area}</td>

                {/* Incapacidades */}
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#DC2626' }}>
                  {col.episodiosInc > 0 ? col.episodiosInc : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                </td>

                {/* Días Incapacidad */}
                <td style={{ textAlign: 'center' }}>
                  {col.diasInc > 0 ? (
                    <span style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 999, padding: '2px 9px', fontWeight: 700, fontSize: 11.5 }}>
                      {col.diasInc.toFixed(0)}d
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>

                {/* Tasa Ausentismo */}
                <td style={{ textAlign: 'center' }}>
                  {col.diasPeriodo > 0 ? (
                    <span style={{ fontWeight: 700, color: col.tasaAusentismo > 15 ? '#DC2626' : col.tasaAusentismo > 8 ? '#D97706' : '#0369A1' }}>
                      {col.tasaAusentismo.toFixed(1)}%
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>

                {/* Novedades Totales */}
                <td style={{ textAlign: 'center', color: '#2563EB', fontWeight: 700 }}>
                  {col.novedades?.length || 0}
                </td>

                {/* Procesos Disciplinarios */}
                <td style={{ textAlign: 'center' }}>
                  {col.procesosDisciplinarios > 0 ? (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: col.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-bg)' : 'var(--warning-bg)',
                      color: col.procesosDisciplinarios >= UMBRAL_ALERTA_PD ? 'var(--danger-text)' : 'var(--warning-text)',
                    }}>
                      📋 {col.procesosDisciplinarios}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>0</span>
                  )}
                </td>

                {/* Vacaciones */}
                <td style={{ textAlign: 'center' }}>
                  {col.vacacionActiva?.enVacaciones ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#E0F2FE', color: '#0369A1' }}>
                      🏖️ En vac.
                    </span>
                  ) : col.vacacionesResumen?.diasPendientes > 0 ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0D9488' }}>
                      {col.vacacionesResumen.diasPendientes.toFixed(0)}d pend.
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Al día</span>
                  )}
                </td>

                {/* Productividad */}
                <td style={{ textAlign: 'center' }}>
                  {col.productividad != null ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)' }}>
                      📈 {formatProductividad(col.productividad, col.productividadCfg)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>

                {/* Parqueadero */}
                <td style={{ textAlign: 'center' }}>
                  {col.parqueadero ? (
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: 11.5,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#4F46E5',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                    }}>
                      {col.parqueadero.placa}
                    </span>
                  ) : col.tieneVehiculo ? (
                    <span style={{ fontSize: 11, color: 'var(--info-text)' }}>🏍️ Vehículo</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
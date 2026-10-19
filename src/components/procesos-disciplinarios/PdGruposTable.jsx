// =============================================================
// src/components/procesos-disciplinarios/PdGruposTable.jsx
// -------------------------------------------------------------
// Tabla agrupada por empleado (extraída de ProcesosDisciplinarios).
// =============================================================
import { Eye } from 'lucide-react'
import { CONCEPTO_MAP, ALERT, UMBRAL_ALERTA } from '../../utils/procesosDisciplinariosConstants'
import './procesos-disciplinarios.css'
import PersonCell from '../ui/PersonCell'

export default function PdGruposTable({ pagedGrupos, onSelectEmpleado }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th style={{ textAlign: 'center' }}>Total</th>
            <th>Último concepto</th>
            <th>Departamento</th>
            <th>Última fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pagedGrupos.map((grupo, i) => {
            const ultimo = grupo.procesos[0]
            const meta = CONCEPTO_MAP[ultimo.concepto] || { icon: '📄' }
            const count = grupo.procesos.length
            const enAlerta = count >= UMBRAL_ALERTA
            return (
              <tr key={grupo.key} className="pd-anim-row" style={{ animationDelay: `${Math.min(i, 20) * 20}ms`, '--row-bg': enAlerta ? 'color-mix(in srgb, var(--danger) 7%, transparent)' : undefined }}>
                <td style={{ maxWidth: 260 }}>
                  <div className="pd-chip" onClick={() => onSelectEmpleado(grupo.key)} style={{ cursor: 'pointer' }}>
                    <PersonCell nombre={grupo.nombre} color={enAlerta ? '#DC2626' : undefined}>
                    {enAlerta && (
                      <span title={`${count} procesos disciplinarios registrados`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 17, height: 17, borderRadius: '50%', background: ALERT.bgStrong,
                          color: ALERT.text, fontSize: 10, fontWeight: 800, border: `1px solid ${ALERT.border}`, flexShrink: 0,
                        }}
                        className="pd-warn-dot">!</span>
                    )}
                    </PersonCell>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 22, padding: '2px 7px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: enAlerta ? ALERT.bgStrong : 'var(--bg)',
                    color: enAlerta ? ALERT.text : 'var(--text-muted)',
                  }}>{count}</span>
                </td>
                <td><span className="badge badge-blue">{meta.icon} {meta.label || ultimo.concepto}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{ultimo.departamento || '—'}</td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  {meta.rango
                    ? <>{ultimo.fecha_inicio || '—'} → {ultimo.fecha_fin || '—'}</>
                    : <>{ultimo.fecha || '—'}{ultimo.hora ? ` · ${ultimo.hora}` : ''}</>}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" title="Ver todos los procesos" onClick={() => onSelectEmpleado(grupo.key)}>
                    <Eye size={13} /> Ver {count > 1 ? `(${count})` : ''}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
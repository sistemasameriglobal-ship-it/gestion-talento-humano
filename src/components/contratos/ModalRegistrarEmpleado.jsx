// =============================================================
// src/components/contratos/ModalRegistrarEmpleado.jsx
// =============================================================
// Modal para pasar un contrato en estado "Pendiente por registrar empleado"
// a colaborador activo en la sección de Empleados.
// Se usa cuando el candidato efectivamente se presenta a laborar.
// =============================================================
import { useState, useMemo } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import { useCompany } from '../../context/CompanyContext'
import { DEPENDENCIAS_EXTENDIDAS } from '../../constants'
import {
  UserPlus,
  UserCheck,
  Building2,
  Calendar,
  DollarSign,
  Briefcase,
  X,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'

export default function ModalRegistrarEmpleado({
  contrato,
  open = true,
  onClose,
  onConfirm,
  dependenciasDisponibles = [],
}) {
  const {
    departamentos = [],
    cargos = [],
    cargosCompletos = [],
  } = useCompany()

  const [modoOtroCargo, setModoOtroCargo] = useState(false)
  const [modoOtraDep, setModoOtraDep] = useState(false)

  const [formData, setFormData] = useState(() => ({
    nombre_completo: contrato?.nombre_trabajador || '',
    tipo_documento: contrato?.tipo_documento || 'CC',
    numero_documento: contrato?.numero_documento || '',
    cargo: contrato?.cargo || '',
    salario: contrato?.salario_monto || 0,
    fecha_ingreso: contrato?.fecha_ingreso || new Date().toISOString().slice(0, 10),
    dependencia: contrato?.dependencia || dependenciasDisponibles[0] || 'Operaciones',
    direccion: contrato?.direccion_trabajador || 'Medellín-Antioquia',
    fecha_nacimiento: contrato?.fecha_nacimiento || '',
    celular: contrato?.telefono_trabajador || contrato?.celular || '',
    correo_personal: contrato?.email_trabajador || '',
  }))

  const listaDepartamentos = useMemo(() => {
    const base = departamentos && departamentos.length > 0 ? departamentos : (dependenciasDisponibles.length > 0 ? dependenciasDisponibles : DEPENDENCIAS_EXTENDIDAS)
    const list = [...base]
    if (!list.includes('APRENDIZ')) list.push('APRENDIZ')
    return [...new Set(list)]
  }, [departamentos, dependenciasDisponibles])

  const listaCargosFiltrados = useMemo(() => {
    let base = cargos && cargos.length > 0 ? cargos : []
    if (base.length === 0) {
      base = [
        'ASESOR COMERCIAL', 'ANALISTA DE CARTERA', 'ANALISTA DE UNDERWRITING',
        'ANALISTA DE VERIFICACIÓN', 'ANALISTA CONTABLE', 'COORDINADOR DE OPERACIONES',
        'SUPERVISOR DE ÁREA', 'ANALISTA DE RRHH', 'SOPORTE TI', 'SERVICIOS GENERALES',
        'APRENDIZ ETAPA LECTIVA', 'APRENDIZ ETAPA PRODUCTIVA'
      ]
    }
    let resultado = [...base]

    if (cargosCompletos && cargosCompletos.length > 0 && formData.dependencia) {
      const depNorm = formData.dependencia.trim().toUpperCase()
      const delDep = cargosCompletos
        .filter(c => c.departamento && c.departamento.trim().toUpperCase() === depNorm)
        .map(c => c.nombre)
      const otros = cargosCompletos
        .filter(c => !c.departamento || c.departamento.trim().toUpperCase() !== depNorm)
        .map(c => c.nombre)
      if (delDep.length > 0) {
        resultado = [...new Set([...delDep, ...otros])]
      }
    }

    if (contrato?.tipo_contrato === 'aprendizaje') {
      const aprendices = resultado.filter(c => c.toLowerCase().includes('aprendiz'))
      const otros = resultado.filter(c => !c.toLowerCase().includes('aprendiz'))
      resultado = [...aprendices, ...otros]
    }

    return [...new Set(resultado)]
  }, [cargos, cargosCompletos, formData.dependencia, contrato?.tipo_contrato])

  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!contrato) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nombre_completo.trim()) {
      setErrorMsg('El nombre completo es obligatorio.')
      return
    }
    if (!formData.numero_documento.trim()) {
      setErrorMsg('El número de documento es obligatorio.')
      return
    }
    if (!formData.fecha_ingreso) {
      setErrorMsg('La fecha de ingreso oficial es obligatoria.')
      return
    }

    try {
      setGuardando(true)
      setErrorMsg('')
      await onConfirm(contrato, formData)
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al registrar el empleado.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AnimatedModal
      open={open}
      onRequestClose={onClose}
      maxWidth="620px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '40px' }}
      modalStyle={{ padding: '24px 28px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#DCFCE7', color: '#15803D', padding: 8, borderRadius: 8 }}>
            <UserPlus size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#15803D' }}>
              Registrar Colaborador en Empleados
            </h3>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Vincular el contrato firmado al expediente activo de personal
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 18, fontSize: 12.5, color: '#1E40AF', lineHeight: 1.5 }}>
        <strong>El colaborador se ha presentado a laborar:</strong><br />
        Al confirmar, se creará automáticamente su registro en la sección de <strong>Empleados</strong>, se creará su período laboral inicial y el contrato pasará a estado <strong>Vigente</strong>.
      </div>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.nombre_completo}
              onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Documento ({formData.tipo_documento}) *
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Briefcase size={13} style={{ color: 'var(--primary)' }} />
                Cargo *
              </label>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {listaCargosFiltrados.length} en Usuarios
              </span>
            </div>

            <select
              value={modoOtroCargo ? '__OTRO__' : (formData.cargo || '')}
              onChange={e => {
                const val = e.target.value
                if (val === '__OTRO__') {
                  setModoOtroCargo(true)
                  setFormData(prev => ({ ...prev, cargo: '' }))
                } else {
                  setModoOtroCargo(false)
                  const cargoObj = cargosCompletos?.find(c => c.nombre === val)
                  setFormData(prev => ({
                    ...prev,
                    cargo: val,
                    dependencia: (!prev.dependencia && cargoObj?.departamento) ? cargoObj.departamento : prev.dependencia,
                  }))
                }
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
              required={!modoOtroCargo}
            >
              <option value="">-- Selecciona el Cargo --</option>
              {formData.cargo && !listaCargosFiltrados.includes(formData.cargo) && !modoOtroCargo && (
                <option value={formData.cargo}>{formData.cargo} (Actual)</option>
              )}
              {listaCargosFiltrados.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__OTRO__">✏️ + Otro cargo personalizado...</option>
            </select>

            {modoOtroCargo && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Escribe el nuevo cargo..."
                  value={formData.cargo || ''}
                  onChange={e => setFormData({ ...formData, cargo: e.target.value.toUpperCase() })}
                  autoFocus
                  required
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--primary)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setModoOtroCargo(false)
                    if (listaCargosFiltrados.length > 0) {
                      setFormData(prev => ({ ...prev, cargo: listaCargosFiltrados[0] }))
                    }
                  }}
                  style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ← Ver lista
                </button>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Building2 size={13} style={{ color: 'var(--primary)' }} />
                Dependencia / Área *
              </label>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {listaDepartamentos.length} en Usuarios
              </span>
            </div>

            <select
              value={modoOtraDep ? '__OTRO__' : (formData.dependencia || '')}
              onChange={e => {
                const val = e.target.value
                if (val === '__OTRO__') {
                  setModoOtraDep(true)
                  setFormData(prev => ({ ...prev, dependencia: '' }))
                } else {
                  setModoOtraDep(false)
                  setFormData(prev => ({ ...prev, dependencia: val }))
                }
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
              required={!modoOtraDep}
            >
              <option value="">-- Selecciona el Área --</option>
              {formData.dependencia && !listaDepartamentos.includes(formData.dependencia) && !modoOtraDep && (
                <option value={formData.dependencia}>{formData.dependencia} (Actual)</option>
              )}
              {listaDepartamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
              <option value="__OTRO__">✏️ + Otra área personalizada...</option>
            </select>

            {modoOtraDep && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Escribe el área..."
                  value={formData.dependencia || ''}
                  onChange={e => setFormData({ ...formData, dependencia: e.target.value.toUpperCase() })}
                  autoFocus
                  required
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--primary)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setModoOtraDep(false)
                    if (listaDepartamentos.length > 0) {
                      setFormData(prev => ({ ...prev, dependencia: listaDepartamentos[0] }))
                    }
                  }}
                  style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ← Ver lista
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Fecha Oficial de Ingreso *
            </label>
            <input
              type="date"
              value={formData.fecha_ingreso}
              onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Salario Mensual ($)
            </label>
            <input
              type="number"
              value={formData.salario}
              onChange={e => setFormData({ ...formData, salario: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Celular / Teléfono (Opcional)
            </label>
            <input
              type="text"
              value={formData.celular}
              onChange={e => setFormData({ ...formData, celular: e.target.value })}
              placeholder="300 123 4567"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Dirección de Residencia
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={e => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Medellín-Antioquia"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn"
            disabled={guardando}
            style={{
              background: '#16A34A', color: '#ffffff', border: 'none',
              padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <UserCheck size={16} />
            <span>{guardando ? 'Registrando...' : 'Confirmar y Crear en Empleados'}</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  )
}

// =============================================================
// src/pages/Contratos.jsx
// =============================================================
// Módulo de Contratos y Confidencialidad
// Tipos soportados:
// 1. Contratos de trabajo a término fijo inferior a un año
//    - Primeros 3 meses: Periodo de prueba inicial.
//    - Si la empresa finaliza el contrato, lo hace en cualquier momento.
//    - Si pasa la prueba, se renueva AUTOMÁTICAMENTE cada 3 meses.
//    - Al cumplir el año, pasa AUTOMÁTICAMENTE a Contrato Anual (1 año).
// 2. Contratos de aprendizaje (SENA)
// 3. Contratos de confidencialidad para ambas partes vinculados
// Autocompletado directo desde el expediente de Empleados.
// =============================================================
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import PageTitle from '../components/ui/PageTitle'
import ContratosKpis from '../components/contratos/ContratosKpis'
import ContratosTable from '../components/contratos/ContratosTable'
import ModalContratoForm from '../components/contratos/ModalContratoForm'
import ModalContratoViewer from '../components/contratos/ModalContratoViewer'
import ModalFinalizarContrato from '../components/contratos/ModalFinalizarContrato'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import * as contratosApi from '../api/contratos'
import * as empleadosApi from '../api/empleados'
import { calcularCiclosYProrroga } from '../utils/contratosTemplates'
import { FileSignature, Plus, Search, Filter, RefreshCw, X, ShieldAlert } from 'lucide-react'
import '../components/contratos/contratos.css'

export default function Contratos() {
  const { currentCompany, companyConfig, canWrite } = useCompany()
  const puedeEditar = canWrite ? canWrite('contratos') : true

  const [contratos, setContratos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('') // '' | 'en_prueba' | 'prorroga_trimestral' | 'contrato_anual' | 'por_vencer' | 'finalizado'

  // Modales
  const [formOpen, setFormOpen] = useState(false)
  const [contratoParaEditar, setContratoParaEditar] = useState(null)
  const [contratoParaVer, setContratoParaVer] = useState(null)
  const [contratoParaFinalizar, setContratoParaFinalizar] = useState(null)
  const [contratoParaEliminar, setContratoParaEliminar] = useState(null)
  const [msg, setMsg] = useState(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [resContratos, resEmpleados] = await Promise.all([
        contratosApi.listarContratos(currentCompany),
        empleadosApi.listarEmpleados(currentCompany),
      ])
      setContratos(resContratos.data || [])
      setEmpleados(resEmpleados.data || [])
    } catch (err) {
      console.error('Error al cargar datos de contratos:', err)
      setMsg({ type: 'error', text: 'No se pudieron cargar los contratos.' })
    } finally {
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Guardado (Crear o Editar)
  const handleGuardarContrato = async (formData, verInmediato = false) => {
    try {
      if (formData.id) {
        // Editar
        const { data, error } = await contratosApi.actualizarContrato(formData.id, formData, currentCompany)
        if (error) throw error
        setMsg({ type: 'success', text: 'Contrato actualizado correctamente.' })
        setFormOpen(false)
        await cargarDatos()
        if (verInmediato && data?.[0]) {
          setContratoParaVer(data[0])
        }
      } else {
        // Crear
        const { data, error } = await contratosApi.crearContrato(formData, currentCompany)
        if (error) throw error
        setMsg({ type: 'success', text: 'Contrato generado con renovación automática cada 3 meses y confidencialidad vinculada.' })
        setFormOpen(false)
        await cargarDatos()
        if (verInmediato && data?.[0]) {
          setContratoParaVer(data[0])
        }
      }
      setTimeout(() => setMsg(null), 4000)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  // Finalizar Contrato
  const handleConfirmarFinalizar = async (id, datosTerminacion) => {
    try {
      const { error } = await contratosApi.actualizarContrato(id, datosTerminacion, currentCompany)
      if (error) throw error
      setMsg({ type: 'success', text: 'El contrato fue finalizado correctamente.' })
      setContratoParaFinalizar(null)
      cargarDatos()
      setTimeout(() => setMsg(null), 4000)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  // Eliminar
  const handleConfirmarEliminar = async () => {
    if (!contratoParaEliminar) return
    try {
      const { error } = await contratosApi.eliminarContrato(contratoParaEliminar.id, currentCompany)
      if (error) throw error
      setMsg({ type: 'success', text: 'Contrato eliminado correctamente.' })
      setContratoParaEliminar(null)
      cargarDatos()
      setTimeout(() => setMsg(null), 4000)
    } catch (err) {
      console.error(err)
      setMsg({ type: 'error', text: 'Error al eliminar el contrato.' })
      setTimeout(() => setMsg(null), 4000)
    }
  }

  // Filtrado inteligente con ciclos y prórrogas automáticas
  const contratosFiltrados = useMemo(() => {
    const q = search.toLowerCase().trim()

    return contratos.filter(c => {
      // Búsqueda textual
      if (q) {
        const enNombre = (c.nombre_trabajador || '').toLowerCase().includes(q)
        const enDoc = (c.numero_documento || '').includes(q)
        const enCargo = (c.cargo || '').toLowerCase().includes(q)
        if (!enNombre && !enDoc && !enCargo) return false
      }

      // Filtro tipo
      if (filtroTipo && c.tipo_contrato !== filtroTipo) {
        return false
      }

      // Filtro estado / ciclo
      if (filtroEstado) {
        if (filtroEstado === 'finalizado') {
          return c.estado === 'finalizado'
        }
        if (c.estado === 'finalizado') return false

        const info = calcularCiclosYProrroga(c)
        if (!info) return true

        if (filtroEstado === 'en_prueba') {
          return Boolean(info.esPeriodoPrueba)
        }
        if (filtroEstado === 'prorroga_trimestral') {
          return !info.esPeriodoPrueba && !info.esContratoAnual && c.tipo_contrato !== 'aprendizaje'
        }
        if (filtroEstado === 'contrato_anual') {
          return Boolean(info.esContratoAnual)
        }
        if (filtroEstado === 'por_vencer') {
          return info.diasParaVencer >= 0 && info.diasParaVencer <= 30
        }
      }

      return true
    })
  }, [contratos, search, filtroTipo, filtroEstado])

  return (
    <div className="contratos-container">
      {/* Mensajes de notificación */}
      {msg && (
        <div style={{
          background: msg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
          color: msg.type === 'error' ? '#B91C1C' : '#15803D',
          border: `1px solid ${msg.type === 'error' ? '#FCA5A5' : '#86EFAC'}`,
          padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Título y Botón Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <PageTitle
          title="Gestión de Contratos"
          subtitle="Renovación automática cada 3 meses (Prueba inicial), transición a Contrato Anual (1 año) y Acuerdos de Confidencialidad vinculados."
        />

        {puedeEditar && (
          <button
            type="button"
            className="btn-nuevo-contrato"
            onClick={() => { setContratoParaEditar(null); setFormOpen(true) }}
          >
            <Plus size={18} />
            <span>Nuevo Contrato</span>
          </button>
        )}
      </div>

      {/* KPI CARDS CON ROL DE PRUEBA Y RENOVACIÓN AUTOMÁTICA */}
      <ContratosKpis
        contratos={contratos}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
      />

      {/* BARRA DE HERRAMIENTAS / FILTROS */}
      <div className="contratos-toolbar">
        <div className="contratos-search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por colaborador, documento o cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="contratos-filters">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los Tipos</option>
            <option value="termino_fijo_menor_anio">⏱️ Término Fijo (Renovable c/3 meses)</option>
            <option value="aprendizaje">🎓 Contrato de Aprendizaje</option>
          </select>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los Ciclos y Estados</option>
            <option value="en_prueba">🛡️ En Período de Prueba (Primeros 3 meses)</option>
            <option value="prorroga_trimestral">🔄 En Prórrogas Trimestrales (Meses 4 a 12)</option>
            <option value="contrato_anual">⭐ Contrato Anual (Mayor a 1 año)</option>
            <option value="por_vencer">⚠️ Fin de Período en ≤ 30 Días (Preaviso)</option>
            <option value="finalizado">🔴 Finalizados / No Renovados</option>
          </select>

          <button
            type="button"
            onClick={cargarDatos}
            title="Recargar contratos"
            style={{
              padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* TABLA DE CONTRATOS */}
      <ContratosTable
        contratos={contratosFiltrados}
        loading={loading}
        puedeEditar={puedeEditar}
        onVerContrato={c => setContratoParaVer(c)}
        onEditarContrato={c => { setContratoParaEditar(c); setFormOpen(true) }}
        onFinalizarContrato={c => setContratoParaFinalizar(c)}
        onEliminarContrato={c => setContratoParaEliminar(c)}
      />

      {/* MODAL FORMULARIO */}
      {formOpen && (
        <ModalContratoForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setContratoParaEditar(null) }}
          onSave={handleGuardarContrato}
          contratoInicial={contratoParaEditar}
          empleados={empleados}
          companyConfig={companyConfig}
        />
      )}

      {/* MODAL VISOR OFICIAL */}
      {contratoParaVer && (
        <ModalContratoViewer
          contrato={contratoParaVer}
          onClose={() => setContratoParaVer(null)}
          onEdit={c => {
            setContratoParaVer(null)
            setContratoParaEditar(c)
            setFormOpen(true)
          }}
        />
      )}

      {/* MODAL FINALIZAR / NO RENOVAR */}
      {contratoParaFinalizar && (
        <ModalFinalizarContrato
          contrato={contratoParaFinalizar}
          onClose={() => setContratoParaFinalizar(null)}
          onConfirmFinalizar={handleConfirmarFinalizar}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {contratoParaEliminar && (
        <DeleteConfirmModal
          isOpen={Boolean(contratoParaEliminar)}
          title="Eliminar Contrato"
          message={`¿Estás seguro de que deseas eliminar el contrato de "${contratoParaEliminar.nombre_trabajador}"? Esta acción removerá el registro del contrato y su confidencialidad vinculada.`}
          onConfirm={handleConfirmarEliminar}
          onCancel={() => setContratoParaEliminar(null)}
        />
      )}
    </div>
  )
}

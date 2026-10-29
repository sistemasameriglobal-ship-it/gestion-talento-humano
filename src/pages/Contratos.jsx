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
import ModalCompartirFirma from '../components/contratos/ModalCompartirFirma'
import ModalFinalizarContrato from '../components/contratos/ModalFinalizarContrato'
import ModalRegistrarEmpleado from '../components/contratos/ModalRegistrarEmpleado'
import ModalDesistirContrato from '../components/contratos/ModalDesistirContrato'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import * as contratosApi from '../api/contratos'
import * as empleadosApi from '../api/empleados'
import * as novedadesApi from '../api/novedades'
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
  const [filtroEstado, setFiltroEstado] = useState('') // '' | 'pendiente_empleado' | 'en_prueba' | 'prorroga_trimestral' | 'contrato_anual' | 'por_vencer' | 'desistido' | 'finalizado'

  // Modales
  const [formOpen, setFormOpen] = useState(false)
  const [contratoParaEditar, setContratoParaEditar] = useState(null)
  const [contratoParaVer, setContratoParaVer] = useState(null)
  const [contratoParaCompartir, setContratoParaCompartir] = useState(null)
  const [contratoParaFinalizar, setContratoParaFinalizar] = useState(null)
  const [contratoParaEliminar, setContratoParaEliminar] = useState(null)
  const [contratoParaRegistrar, setContratoParaRegistrar] = useState(null)
  const [contratoParaDesistir, setContratoParaDesistir] = useState(null)
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
        setMsg({ type: 'success', text: 'Contrato generado exitosamente. Puedes compartir el enlace para la firma digital.' })
        setFormOpen(false)
        await cargarDatos()
        if (data?.[0]) {
          setContratoParaCompartir(data[0])
        } else if (verInmediato && data?.[0]) {
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
  const handleConfirmarEliminar = async (idToDelete) => {
    const id = idToDelete || contratoParaEliminar?.id
    if (!id) return
    try {
      const { error } = await contratosApi.eliminarContrato(id, currentCompany)
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

  // Registrar Candidato en Empleados y generar Novedad de Ingreso automática
  const handleConfirmarRegistroEmpleado = async (contrato, datosEmpleado) => {
    try {
      // 1. Verificar si el empleado ya existe por documento para evitar duplicaciones
      const docNormalizado = String(datosEmpleado.numero_documento || contrato.numero_documento || '').trim().replace(/\D/g, '')
      const empExistente = (empleados || []).find(e => {
        const docE = String(e.numero_documento || '').trim().replace(/\D/g, '')
        return docE && docNormalizado && docE === docNormalizado
      })

      let nuevoEmpleadoId = empExistente?.id

      if (!nuevoEmpleadoId) {
        // Crear el empleado en la base de datos de nómina
        const { data: empCreado, error: empErr } = await empleadosApi.crearEmpleado(datosEmpleado, currentCompany)
        if (empErr) throw empErr
        nuevoEmpleadoId = empCreado?.id || (Array.isArray(empCreado) && empCreado[0]?.id)
      } else {
        // Si ya existía, sincronizar sus datos actualizados
        await empleadosApi.actualizarEmpleado(nuevoEmpleadoId, datosEmpleado, currentCompany)
      }

      // 2. Actualizar el contrato vinculando el empleado_id, empleado_registrado y cambiando el estado a 'vigente'
      const { error: contErr } = await contratosApi.actualizarContrato(
        contrato.id,
        {
          empleado_id: nuevoEmpleadoId || null,
          empleado_registrado: true,
          novedad_ingreso_registrada: true,
          estado: 'vigente',
          nombre_trabajador: datosEmpleado.nombre_completo || contrato.nombre_trabajador,
          numero_documento: datosEmpleado.numero_documento || contrato.numero_documento,
          cargo: datosEmpleado.cargo || contrato.cargo,
          dependencia: datosEmpleado.dependencia || contrato.dependencia,
          direccion_trabajador: datosEmpleado.direccion || contrato.direccion_trabajador,
          telefono_trabajador: datosEmpleado.celular || contrato.telefono_trabajador,
          fecha_ingreso: datosEmpleado.fecha_ingreso || contrato.fecha_ingreso,
          salario_monto: datosEmpleado.salario ? Number(datosEmpleado.salario) : contrato.salario_monto,
        },
        currentCompany
      )
      if (contErr) throw contErr

      // 3. Crear novedad de "Ingreso" automática en el módulo de Novedades
      const fechaIngresoFinal = datosEmpleado.fecha_ingreso || contrato.fecha_ingreso || new Date().toISOString().slice(0, 10)
      const periodoIngreso = String(fechaIngresoFinal).slice(0, 7)

      try {
        const { data: novsExistentes } = await novedadesApi.buscarNovedadPorEmpleadoConceptoYFecha(
          datosEmpleado.nombre_completo || contrato.nombre_trabajador,
          'Ingreso',
          fechaIngresoFinal,
          currentCompany
        )

        if (!novsExistentes || novsExistentes.length === 0) {
          await novedadesApi.crearNovedad({
            nombre_empleado: datosEmpleado.nombre_completo || contrato.nombre_trabajador,
            empleado_id: nuevoEmpleadoId || null,
            concepto: 'Ingreso',
            fecha_inicio: fechaIngresoFinal,
            fecha_fin: fechaIngresoFinal,
            total_dias: 0,
            periodo: periodoIngreso,
            cargo: datosEmpleado.cargo || contrato.cargo,
            dependencia: datosEmpleado.dependencia || contrato.dependencia,
            empresa: currentCompany,
            observacion: 'Registro de ingreso formalizado automáticamente desde la firma y vinculación de contrato.',
          }, currentCompany)
        }
      } catch (novErr) {
        console.warn('Advertencia al registrar novedad de ingreso automática:', novErr)
      }

      setMsg({
        type: 'success',
        text: `¡${datosEmpleado.nombre_completo} ha sido registrado(a) exitosamente en Empleados y se agregó la novedad de Ingreso en Novedades!`
      })
      setContratoParaRegistrar(null)
      await cargarDatos()
      setTimeout(() => setMsg(null), 5000)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  // Desistir Contrato (Candidato no se presentó / declinó la vacante)
  const handleConfirmarDesistir = async (contratoId, motivo) => {
    try {
      const { error } = await contratosApi.actualizarContrato(
        contratoId,
        {
          estado: 'desistido',
          motivo_finalizacion: motivo || 'Candidato desistió / No se presentó a trabajar',
        },
        currentCompany
      )
      if (error) throw error

      setMsg({
        type: 'success',
        text: 'El contrato fue archivado como "Desistió del proceso". No se crearon registros innecesarios en la lista de empleados.'
      })
      setContratoParaDesistir(null)
      await cargarDatos()
      setTimeout(() => setMsg(null), 5000)
    } catch (err) {
      console.error(err)
      throw err
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
        if (filtroEstado === 'pendiente_empleado') {
          return c.estado === 'pendiente_empleado'
        }
        if (filtroEstado === 'desistido') {
          return c.estado === 'desistido'
        }
        if (filtroEstado === 'finalizado') {
          return c.estado === 'finalizado'
        }

        // Si es un filtro de ciclo regular activo, descartamos finalizados, desistidos y pendientes
        if (c.estado === 'finalizado' || c.estado === 'desistido' || c.estado === 'pendiente_empleado') {
          return false
        }

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
          subtitle="Contratos de 3 meses con 2 meses de prueba inicial, renovación automática trimestral, transición a Contrato Anual (1 año) y Acuerdos de Confidencialidad."
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
            <option value="pendiente_empleado">🟡 Pendientes por Registrar en Empleados</option>
            <option value="en_prueba">🛡️ En Período de Prueba (Primeros 2 meses)</option>
            <option value="prorroga_trimestral">🔄 En Prórrogas Trimestrales</option>
            <option value="contrato_anual">⭐ Contrato Anual (Mayor a 1 año)</option>
            <option value="por_vencer">⚠️ Fin de Período en ≤ 30 Días (Preaviso)</option>
            <option value="desistido">⚪ Desistieron del Proceso / No Ingresaron</option>
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
        empleados={empleados}
        loading={loading}
        puedeEditar={puedeEditar}
        onVerContrato={c => setContratoParaVer(c)}
        onEditarContrato={c => { setContratoParaEditar(c); setFormOpen(true) }}
        onFinalizarContrato={c => setContratoParaFinalizar(c)}
        onEliminarContrato={c => setContratoParaEliminar(c)}
        onRegistrarEmpleado={c => setContratoParaRegistrar(c)}
        onDesistirContrato={c => setContratoParaDesistir(c)}
        onCompartirFirma={c => setContratoParaCompartir(c)}
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
          onCompartirFirma={c => {
            setContratoParaVer(null)
            setContratoParaCompartir(c)
          }}
          puedeEditar={puedeEditar}
          onEdit={puedeEditar ? (c => {
            setContratoParaVer(null)
            setContratoParaEditar(c)
            setFormOpen(true)
          }) : undefined}
        />
      )}

      {/* MODAL COMPARTIR ENLACE DE FIRMA */}
      {contratoParaCompartir && (
        <ModalCompartirFirma
          contrato={contratoParaCompartir}
          onClose={() => setContratoParaCompartir(null)}
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

      {/* MODAL REGISTRAR EN EMPLEADOS */}
      {contratoParaRegistrar && (
        <ModalRegistrarEmpleado
          open={Boolean(contratoParaRegistrar)}
          contrato={contratoParaRegistrar}
          onClose={() => setContratoParaRegistrar(null)}
          onConfirm={handleConfirmarRegistroEmpleado}
        />
      )}

      {/* MODAL DESISTIR PROCESO */}
      {contratoParaDesistir && (
        <ModalDesistirContrato
          contrato={contratoParaDesistir}
          onClose={() => setContratoParaDesistir(null)}
          onConfirm={handleConfirmarDesistir}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {contratoParaEliminar && (
        <DeleteConfirmModal
          deleteId={contratoParaEliminar?.id}
          onClose={() => setContratoParaEliminar(null)}
          onConfirm={handleConfirmarEliminar}
          message={`¿Estás seguro de que deseas eliminar el contrato de "${contratoParaEliminar.nombre_trabajador}"? Esta acción removerá el registro del contrato y su confidencialidad vinculada.`}
        />
      )}
    </div>
  )
}

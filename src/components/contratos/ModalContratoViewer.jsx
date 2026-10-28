// =============================================================
// src/components/contratos/ModalContratoViewer.jsx
// =============================================================
import { useState, useMemo, useRef } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import {
  generarHtmlDocumento,
  imprimirContrato,
  descargarComoWord,
} from '../../utils/contratosTemplates'
import {
  obtenerFirmaEmpleador,
  guardarFirmaEmpleadorPersonalizada,
} from '../../utils/contratoFirma'
import {
  Printer,
  Download,
  Copy,
  Edit,
  X,
  FileCheck2,
  Lock,
  Files,
  Check,
  CalendarClock,
  User,
  Briefcase,
  CreditCard,
  PenTool,
  FileUp,
  RotateCcw,
  Link2,
} from 'lucide-react'

export default function ModalContratoViewer({ contrato, onClose, onEdit, onCompartirFirma, puedeEditar = true }) {
  const [tab, setTab] = useState('completo') // 'completo' | 'principal' | 'confidencialidad' | 'linea_tiempo'
  const [copiado, setCopiado] = useState(false)
  const [firmaVersion, setFirmaVersion] = useState(0)
  const [mostrarFirmaConfig, setMostrarFirmaConfig] = useState(false)
  const fileInputRef = useRef(null)

  if (!contrato) return null

  const esAprendiz = contrato.tipo_contrato === 'aprendizaje'
  const tituloModal = esAprendiz ? 'Contrato de Aprendizaje (Ley 789)' : 'Contrato a Término Fijo Inferior a 1 Año'

  // Recalcular documento cuando cambia la pestaña o la firma
  const htmlContent = useMemo(() => {
    return generarHtmlDocumento(contrato, tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato, tab, firmaVersion])

  const handleCopiar = () => {
    const div = document.createElement('div')
    div.innerHTML = htmlContent
    const texto = div.innerText || div.textContent || ''
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <AnimatedModal
      open={Boolean(contrato)}
      onRequestClose={onClose}
      maxWidth="1160px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '24px' }}
      modalStyle={{ width: '96vw', padding: '20px 24px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* 1. CABECERA SUPERIOR LIMPIA CON DATOS Y BOTÓN CERRAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
        gap: 16
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {tituloModal}
            </h3>
            <span className={`contrato-badge-tipo ${esAprendiz ? 'badge-aprendizaje' : 'badge-termino-fijo'}`}>
              {esAprendiz ? '🎓 Aprendiz SENA' : '⏱️ Término Fijo < 1 Año (Prórrogas c/3 meses)'}
            </span>
            {contrato.estado === 'pendiente_empleado' && (
              <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                🟡 Candidato por Ingresar
              </span>
            )}
          </div>

          {/* Ficha de datos del colaborador con píldoras elegantes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <User size={13} color="#2563EB" />
              <strong style={{ color: 'var(--text)' }}>{contrato.nombre_trabajador}</strong>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <CreditCard size={13} color="#64748B" />
              <span>{contrato.tipo_documento} {contrato.numero_documento}</span>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <Briefcase size={13} color="#059669" />
              <span>Cargo: <strong style={{ color: 'var(--text)' }}>{contrato.cargo || '—'}</strong></span>
            </span>
          </div>
        </div>

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.background = '#FEE2E2' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. BARRA DE CONTROL: PESTAÑAS (IZQUIERDA) Y BOTONES DE ACCIÓN (DERECHA) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 0 14px 0',
      }}>
        {/* Pestañas de Navegación del Documento */}
        <div className="contrato-viewer-tabs-group">
          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'completo' ? 'active' : ''}`}
            onClick={() => setTab('completo')}
          >
            <Files size={15} />
            <span>Ambos Contratos (Completo)</span>
          </button>

          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'principal' ? 'active' : ''}`}
            onClick={() => setTab('principal')}
          >
            <FileCheck2 size={15} />
            <span>1. {esAprendiz ? 'Contrato Aprendizaje' : 'Contrato Laboral'}</span>
          </button>

          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'confidencialidad' ? 'active' : ''}`}
            onClick={() => setTab('confidencialidad')}
          >
            <Lock size={15} />
            <span>2. Confidencialidad</span>
          </button>

          {!esAprendiz && (
            <button
              type="button"
              className={`tab-contrato-pill ${tab === 'linea_tiempo' ? 'active' : ''}`}
              onClick={() => setTab('linea_tiempo')}
            >
              <CalendarClock size={15} />
              <span>Cronograma Prórrogas</span>
            </button>
          )}
        </div>

        {/* Botones de Exportación y Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Botón Gestión de Firma del Empleador (solo si tiene permisos de edición) */}
          {puedeEditar && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-viewer-action"
                onClick={() => setMostrarFirmaConfig(v => !v)}
                title="Configurar o cambiar la firma digital oficial del Empleador"
                style={{
                  background: '#F0FDF4',
                  borderColor: '#BBF7D0',
                  color: '#15803D',
                  fontWeight: 700,
                }}
              >
                <PenTool size={14} />
                <span>Firma Empleador ✓</span>
              </button>

              {mostrarFirmaConfig && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  padding: '14px 16px',
                  width: 290,
                  zIndex: 100,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                    ✍️ Firma del Empleador
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Aparece por defecto en todos los contratos y documentos Word/PDF para <strong>Carlos Alberto Herrera</strong>.
                  </div>

                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '8px',
                    textAlign: 'center',
                    marginBottom: 10,
                  }}>
                    <img
                      src={obtenerFirmaEmpleador(contrato)}
                      alt="Vista previa firma empleador"
                      style={{ maxHeight: 45, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '7px 10px', borderRadius: 7, border: '1px solid #BFDBFE',
                        background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <FileUp size={14} />
                      <span>Subir Foto / Escaneo de Firma</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        guardarFirmaEmpleadorPersonalizada(null)
                        setFirmaVersion(v => v + 1)
                        setMostrarFirmaConfig(false)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 11.5, cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Restablecer firma por defecto</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = evt => {
                        const b64 = evt.target.result
                        guardarFirmaEmpleadorPersonalizada(b64)
                        setFirmaVersion(v => v + 1)
                        setMostrarFirmaConfig(false)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {onCompartirFirma && (
            <button
              type="button"
              className="btn-viewer-action"
              onClick={() => onCompartirFirma(contrato)}
              title="Compartir enlace para que el empleado firme ambos contratos digitalmente"
              style={{
                background: '#EFF6FF',
                borderColor: '#BFDBFE',
                color: '#1D4ED8',
                fontWeight: 600,
              }}
            >
              <Link2 size={15} />
              <span>Enlace de Firma</span>
            </button>
          )}

          <button
            type="button"
            className="btn-viewer-action btn-viewer-primary"
            onClick={() => imprimirContrato(contrato, tab)}
            title="Abrir vista oficial de impresión con encabezados repetibles y guardar PDF"
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            className="btn-viewer-action"
            onClick={() => descargarComoWord(contrato, tab)}
            title="Descargar archivo editable compatible con Microsoft Word (.doc)"
          >
            <Download size={15} />
            <span>Descargar Word</span>
          </button>

          <button
            type="button"
            className="btn-viewer-action"
            onClick={handleCopiar}
            title="Copiar texto del documento al portapapeles"
          >
            {copiado ? <Check size={15} color="#16A34A" /> : <Copy size={15} />}
            <span>{copiado ? 'Copiado' : 'Copiar'}</span>
          </button>

          {onEdit && (
            <button
              type="button"
              className="btn-viewer-action btn-viewer-edit"
              onClick={() => { onClose(); onEdit(contrato) }}
              title="Modificar cláusulas, salario o fechas de este contrato"
            >
              <Edit size={15} />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. HOJA DE VISTA PREVIA DEL DOCUMENTO */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#E2E8F0',
        padding: '24px 20px',
        borderRadius: 10,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
      }}>
        <div
          className="contrato-preview-sheet"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </AnimatedModal>
  )
}

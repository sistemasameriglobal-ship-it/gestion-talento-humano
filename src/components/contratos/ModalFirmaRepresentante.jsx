// =============================================================
// src/components/contratos/ModalFirmaRepresentante.jsx
// Modal para subir foto o gestionar la firma digital del
// Representante Legal (Carlos Alberto Herrera - AmeriGlobal S.A.S)
// =============================================================
import { useState, useRef, useEffect } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import {
  obtenerFirmaEmpleador,
  guardarFirmaEmpleadorPersonalizada,
  FIRMA_EMPLEADOR_BASE64,
} from '../../utils/contratoFirma'
import {
  PenTool,
  FileUp,
  RotateCcw,
  Check,
  X,
  ShieldCheck,
  Camera,
  Trash2,
  Sparkles,
} from 'lucide-react'

export default function ModalFirmaRepresentante({ open, onClose, onFirmaGuardada }) {
  const [firmaActual, setFirmaActual] = useState(obtenerFirmaEmpleador())
  const [firmaNueva, setFirmaNueva] = useState(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [tabModo, setTabModo] = useState('subir') // 'subir' | 'dibujar'
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)
  const [dibujando, setDibujando] = useState(false)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (open) {
      setFirmaActual(obtenerFirmaEmpleador())
      setFirmaNueva(null)
      setNombreArchivo('')
      setGuardadoExitoso(false)
    }
  }, [open])

  // Inicializar Canvas de dibujo si entra al modo dibujar
  useEffect(() => {
    if (open && tabModo === 'dibujar' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = 140 * dpr
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [open, tabModo])

  // Manejo de carga de archivo (foto / escaneo de firma)
  const handleSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG, WEBP).')
      return
    }

    setNombreArchivo(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      setFirmaNueva(evt.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Funciones del Canvas para dibujar
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    setDibujando(true)
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!dibujando) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!dibujando) return
    setDibujando(false)
    if (canvasRef.current) {
      setFirmaNueva(canvasRef.current.toDataURL('image/png'))
    }
  }

  const limpiarCanvas = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setFirmaNueva(null)
  }

  // Guardar firma personalizada
  const handleGuardarFirma = () => {
    const firmaAGuardar = firmaNueva || firmaActual
    if (!firmaAGuardar) return

    guardarFirmaEmpleadorPersonalizada(firmaAGuardar)
    setFirmaActual(firmaAGuardar)
    setFirmaNueva(null)
    setNombreArchivo('')
    setGuardadoExitoso(true)

    // Notificar a toda la ventana para actualizar vistas de contratos abiertas
    window.dispatchEvent(new CustomEvent('firma-empleador-actualizada', { detail: { firma: firmaAGuardar } }))
    if (onFirmaGuardada) onFirmaGuardada(firmaAGuardar)

    setTimeout(() => {
      setGuardadoExitoso(false)
      onClose()
    }, 1800)
  }

  // Restablecer a la firma oficial por defecto
  const handleRestablecerPorDefecto = () => {
    if (!confirm('¿Deseas restablecer la firma oficial original de Carlos Alberto Herrera?')) return
    guardarFirmaEmpleadorPersonalizada(null)
    setFirmaActual(FIRMA_EMPLEADOR_BASE64)
    setFirmaNueva(null)
    setNombreArchivo('')
    setGuardadoExitoso(true)

    window.dispatchEvent(new CustomEvent('firma-empleador-actualizada', { detail: { firma: FIRMA_EMPLEADOR_BASE64 } }))
    if (onFirmaGuardada) onFirmaGuardada(FIRMA_EMPLEADOR_BASE64)

    setTimeout(() => {
      setGuardadoExitoso(false)
      onClose()
    }, 1200)
  }

  const firmaEnVista = firmaNueva || firmaActual

  return (
    <AnimatedModal
      open={open}
      onRequestClose={onClose}
      maxWidth="620px"
      modalStyle={{ padding: '24px 28px', borderRadius: 16 }}
    >
      {/* Input de archivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={handleSeleccionarArchivo}
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16A34A',
          }}>
            <PenTool size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
              Firma del Representante Legal
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Carlos Alberto Herrera · AMERIGLOBAL S.A.S
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Alerta de Confidencialidad */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <ShieldCheck size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.5 }}>
          <strong>Protección de Confidencialidad:</strong> La firma del Representante Legal configurada aquí
          <strong> NO será visible para candidatos ni colaboradores</strong> en contratos pendientes.
          Se colocará de manera 100% automática en el Contrato Laboral y Acuerdo de Confidencialidad
          <strong> únicamente después de que la persona haya firmado digitalmente</strong>.
        </div>
      </div>

      {/* Pestañas: Subir Foto vs Dibujar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setTabModo('subir')}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 8,
            border: tabModo === 'subir' ? '1.5px solid #2563EB' : '1px solid var(--border)',
            background: tabModo === 'subir' ? '#EFF6FF' : 'var(--bg)',
            color: tabModo === 'subir' ? '#1D4ED8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          <Camera size={16} />
          <span>📷 Subir Foto de la Firma</span>
        </button>

        <button
          type="button"
          onClick={() => setTabModo('dibujar')}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 8,
            border: tabModo === 'dibujar' ? '1.5px solid #2563EB' : '1px solid var(--border)',
            background: tabModo === 'dibujar' ? '#EFF6FF' : 'var(--bg)',
            color: tabModo === 'dibujar' ? '#1D4ED8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          <PenTool size={16} />
          <span>✍️ Dibujar en Pantalla</span>
        </button>
      </div>

      {/* Contenido según el modo */}
      {tabModo === 'subir' ? (
        <div style={{
          border: '2px dashed #93C5FD',
          background: '#F8FAFC',
          borderRadius: 12,
          padding: '24px 18px',
          textAlign: 'center',
          marginBottom: 18,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onClick={() => fileInputRef.current?.click()}
        >
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: '#DBEAFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            color: '#1D4ED8',
          }}>
            <FileUp size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Haz clic aquí para seleccionar la foto o escaneo de la firma
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Soporta fotos tomadas con el celular o escaneos (PNG, JPG, WEBP)
          </div>
          {nombreArchivo && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#DCFCE7', padding: '3px 10px', borderRadius: 6 }}>
              <Check size={14} />
              <span>Archivo seleccionado: {nombreArchivo}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            border: '2px solid #CBD5E1',
            borderRadius: 10,
            background: '#FFFFFF',
            position: 'relative',
            height: 140,
            cursor: 'crosshair',
          }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!firmaNueva && !dibujando && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#94A3B8',
                fontSize: 13,
                pointerEvents: 'none',
              }}>
                Traza la firma aquí con el mouse o dedo
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="button"
              onClick={limpiarCanvas}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Trash2 size={13} />
              <span>Limpiar trazo</span>
            </button>
          </div>
        </div>
      )}

      {/* Vista previa realista en el contrato */}
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#D97706" />
          <span>Vista Previa: Así se colocará en los contratos finales firmados</span>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '16px 24px',
          maxWidth: 320,
          margin: '0 auto',
          textAlign: 'left',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}>
          <div style={{ height: 60, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            {firmaEnVista ? (
              <img
                src={firmaEnVista}
                alt="Firma Representante Legal"
                style={{ maxHeight: 55, maxWidth: 170, objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                (Espacio de firma)
              </span>
            )}
          </div>

          <div style={{ borderTop: '1.5pt solid #000000', width: '90%', marginBottom: 6 }}></div>

          <div style={{ fontWeight: 800, fontSize: 12, color: '#000000', textTransform: 'uppercase' }}>
            CARLOS ALBERTO HERRERA
          </div>
          <div style={{ fontSize: 11, color: '#333333' }}>
            Representante Legal
          </div>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#000000' }}>
            AMERIGLOBAL S.A.S
          </div>
          <div style={{ fontSize: 10, color: '#555555' }}>
            NIT 901272369-7
          </div>
        </div>
      </div>

      {/* Mensaje de éxito al guardar */}
      {guardadoExitoso && (
        <div style={{
          background: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #86EFAC',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease',
        }}>
          <Check size={18} />
          <span>¡Firma del Representante Legal guardada correctamente!</span>
        </div>
      )}

      {/* Botones de acción inferiores */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleRestablecerPorDefecto}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Volver a la firma original de Carlos Alberto Herrera"
        >
          <RotateCcw size={14} />
          <span>Restablecer Original</span>
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '9px 16px',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardarFirma}
            disabled={!firmaNueva && !firmaActual}
            style={{
              background: '#16A34A',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
            }}
          >
            <Check size={16} />
            <span>Guardar Firma</span>
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}

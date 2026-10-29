// =============================================================
// src/pages/PaginaFirmaContrato.jsx
// -------------------------------------------------------------
// Portal público de visualización y firma digital de contratos.
// Permite al colaborador revisar y firmar simultáneamente:
// 1. Contrato Laboral / Contrato de Aprendizaje
// 2. Acuerdo de Confidencialidad
// Funciona en móviles (con dedo), tablets y computadores (mouse).
// =============================================================

import { useState, useEffect, useRef } from 'react'
import {
  obtenerContrato,
  firmarContratoEmpleado,
} from '../api/contratos'
import {
  generarHtmlDocumento,
} from '../utils/contratosTemplates'
import {
  FileSignature,
  FileCheck2,
  Lock,
  FileText,
  User,
  Briefcase,
  Calendar,
  DollarSign,
  Building2,
  Check,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import './PaginaFirmaContrato.css'

export default function PaginaFirmaContrato() {
  const [contratoId, setContratoId] = useState(null)
  const [contrato, setContrato] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pestaña activa de lectura: 'completo' | 'principal' | 'confidencialidad'
  const [activeTab, setActiveTab] = useState('completo')

  // Estado de firma
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [firmaVacia, setFirmaVacia] = useState(true)
  const [firmando, setFirmando] = useState(false)
  const [exitoFirma, setExitoFirma] = useState(false)

  // Referencias Canvas para firma
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)

  // Obtener ID desde hash, pathname o query params de la URL
  useEffect(() => {
    const parseUrlId = () => {
      const hash = window.location.hash || ''
      const path = window.location.pathname || ''
      const search = window.location.search || ''

      // 1. Buscar en hash: #/firmar-contrato/:id o #/firmar/:id
      const matchHash = hash.match(/#\/(?:firmar-contrato|firmar)\/([^/?&#]+)/i)
      if (matchHash && matchHash[1]) {
        setContratoId(decodeURIComponent(matchHash[1]).trim())
        return
      }

      // 2. Buscar en pathname: /firmar-contrato/:id o /firmar/:id
      const matchPath = path.match(/\/(?:firmar-contrato|firmar)\/([^/?&#]+)/i)
      if (matchPath && matchPath[1]) {
        setContratoId(decodeURIComponent(matchPath[1]).trim())
        return
      }

      // 3. Buscar en search query params: ?id=... o ?contratoId=...
      const params = new URLSearchParams(search)
      const qId = params.get('id') || params.get('contratoId')
      if (qId) {
        setContratoId(qId.trim())
        return
      }

      // 4. Si la URL contiene un UUID de Supabase
      const uuidMatch = (hash + path + search).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
      if (uuidMatch && uuidMatch[1]) {
        setContratoId(uuidMatch[1])
        return
      }

      setError('El enlace de firma es inválido o no contiene el identificador de contrato.')
      setLoading(false)
    }

    parseUrlId()
    window.addEventListener('hashchange', parseUrlId)
    window.addEventListener('popstate', parseUrlId)
    return () => {
      window.removeEventListener('hashchange', parseUrlId)
      window.removeEventListener('popstate', parseUrlId)
    }
  }, [])

  // Cargar contrato desde la base de datos
  useEffect(() => {
    if (!contratoId) return

    let cancelado = false
    setLoading(true)
    setError(null)

    async function cargar() {
      try {
        const res = await obtenerContrato(contratoId)
        if (cancelado) return

        const c = res?.data
        if (!c) {
          setError('No pudimos encontrar el contrato solicitado. Puede que haya sido retirado o el enlace haya expirado.')
        } else {
          setContrato(c)
          if (c.firmado_por_trabajador || c.firma_trabajador) {
            setExitoFirma(true)
          }
        }
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando contrato para firma:', err)
          setError(err.message || 'Error al conectar con el servidor.')
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [contratoId])

  // Inicializar Canvas con soporte Retina / High DPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#0F172A'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [contrato, exitoFirma])

  // Métodos de dibujo en Canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    isDrawingRef.current = true
    hasDrawnRef.current = true
    setFirmaVacia(false)

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return
    if (e) e.preventDefault()
    isDrawingRef.current = false
  }

  const limpiarFirma = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setFirmaVacia(true)
  }

  // Manejador para enviar la firma
  const handleFirmar = async () => {
    if (firmaVacia || !hasDrawnRef.current) {
      alert('Por favor dibuja tu firma manuscrita en el recuadro antes de continuar.')
      return
    }

    if (!aceptaTerminos) {
      alert('Debes marcar la casilla aceptando los términos y condiciones de ambos contratos.')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    try {
      setFirmando(true)
      const firmaDataUrl = canvas.toDataURL('image/png')

      const datosFirma = {
        firma_trabajador: firmaDataUrl,
        nombre_firmante: contrato.nombre_trabajador,
        documento_firmante: contrato.numero_documento,
      }

      const actualizado = await firmarContratoEmpleado(contrato.id, datosFirma, contrato.empresa)
      setContrato(actualizado)
      setExitoFirma(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error al firmar contrato:', err)
      alert(`No fue posible guardar la firma: ${err.message || 'Error desconocido'}`)
    } finally {
      setFirmando(false)
    }
  }

  // Formato de moneda
  const formatPesos = (val) => {
    const n = Number(val) || 0
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(n)
  }

  // Estados de carga y error
  if (loading) {
    return (
      <div className="firma-page-root" style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={44} color="#60A5FA" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0' }}>Cargando contratos...</h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Preparando tus documentos legales para revisión y firma digital.
          </p>
        </div>
      </div>
    )
  }

  if (error || !contrato) {
    return (
      <div className="firma-page-root" style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '28px 24px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <AlertCircle size={44} color="#F87171" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Enlace no disponible</h2>
          <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            {error || 'No fue posible cargar la información del contrato.'}
          </p>
          <div style={{ fontSize: 11.5, color: '#94A3B8', borderTop: '1px solid #334155', paddingTop: 14 }}>
            Si crees que esto es un error, por favor solicita un nuevo enlace al área de Gestión Humana.
          </div>
        </div>
      </div>
    )
  }

  // PANTALLA DE ÉXITO CUANDO YA ESTÁ FIRMADO
  // Por estricta confidencialidad de la empresa, no se muestra el contrato con la firma del representante legal en esta vista pública
  if (exitoFirma) {
    return (
      <div className="firma-page-root">
        {/* Barra superior institucional */}
        <header className="firma-navbar">
          <div className="firma-navbar-container">
            <div className="firma-navbar-brand">
              <div className="firma-navbar-logo-badge">
                <FileSignature size={22} />
              </div>
              <div>
                <span className="firma-navbar-company">
                  {contrato.razon_social || 'AmeriGlobal S.A.S'}
                </span>
                <span className="firma-navbar-portal-name">
                  Portal Oficial de Firma Digital de Contratos
                </span>
              </div>
            </div>

            <div className="firma-legal-badge">
              <ShieldCheck size={16} />
              <span>Validez Legal (Ley 527 de 1999)</span>
            </div>
          </div>
        </header>

        {/* Contenido principal centrado con tarjeta de éxito */}
        <main className="firma-main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 180px)', padding: '32px 16px' }}>
          <div style={{
            maxWidth: 600,
            width: '100%',
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: 20,
            padding: '36px 30px',
            textAlign: 'center',
            boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
            color: '#F8FAFC'
          }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: '#064E3B',
              border: '2px solid #10B981',
              color: '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)'
            }}>
              <CheckCircle2 size={44} />
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px 0', color: '#FFFFFF' }}>
              ¡Contrato Firmado con Éxito!
            </h1>

            <p style={{ fontSize: 14.5, color: '#94A3B8', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Tu firma digital ha sido registrada y procesada satisfactoriamente en el sistema.
            </p>

            {/* Ficha resumen informativa */}
            <div style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: 14,
              padding: '18px 20px',
              textAlign: 'left',
              marginBottom: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>Colaborador:</span>
                <strong style={{ fontSize: 13.5, color: '#F1F5F9' }}>{contrato.nombre_trabajador}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>Documento de Identidad:</span>
                <span style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 600 }}>{contrato.tipo_documento} {contrato.numero_documento}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>Cargo a Desempeñar:</span>
                <span style={{ fontSize: 13, color: '#60A5FA', fontWeight: 700 }}>{contrato.cargo || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>Documentos Suscritos:</span>
                <span style={{ fontSize: 12.5, color: '#A7F3D0', fontWeight: 700 }}>Contrato Laboral y Confidencialidad</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>Fecha y Hora de Firma:</span>
                <span style={{ fontSize: 12.5, color: '#34D399', fontWeight: 700 }}>{contrato.fecha_firma_trabajador || 'Registrada exitosamente'}</span>
              </div>
            </div>

            {/* Aviso de Confidencialidad y Custodia Documental */}
            <div style={{
              background: '#0B2027',
              border: '1px solid #164E63',
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginBottom: 24,
            }}>
              <ShieldCheck size={20} color="#22D3EE" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: '#CFFAFE', lineHeight: 1.5 }}>
                <strong>Custodia y Formalización Documental:</strong> Tu expediente ha sido radicado ante Gestión del Talento Humano. La copia legalizada y finalizada te será entregada por el equipo de Talento Humano de AmeriGlobal S.A.S.
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px 0' }}>
              ✓ Has finalizado el proceso de firma. Ya puedes cerrar esta ventana con total tranquilidad.
            </p>

            <button
              type="button"
              onClick={() => {
                if (window.opener) {
                  window.close()
                } else {
                  window.location.href = 'about:blank'
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 24px',
                borderRadius: 10,
                background: '#334155',
                color: '#F8FAFC',
                border: '1px solid #475569',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#475569' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#334155' }}
            >
              Cerrar esta Ventana
            </button>
          </div>
        </main>

        {/* Pie de página */}
        <footer className="firma-footer">
          <p style={{ margin: 0, fontWeight: 600 }}>
            Sistema de Gestión de Talento Humano — {contrato.razon_social || 'AmeriGlobal S.A.S'}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748B' }}>
            Documento electrónico con plena validez probatoria legal (Ley 527 de 1999).
          </p>
        </footer>
      </div>
    )
  }

  const htmlVisualizar = generarHtmlDocumento(contrato, activeTab)
  const esAprendiz = contrato.tipo_contrato === 'aprendizaje'
  const tituloContrato = esAprendiz ? 'Contrato de Aprendizaje (Ley 789)' : 'Contrato Laboral a Término Fijo'

  return (
    <div className="firma-page-root">
      {/* Barra superior institucional */}
      <header className="firma-navbar">
        <div className="firma-navbar-container">
          <div className="firma-navbar-brand">
            <div className="firma-navbar-logo-badge">
              <FileSignature size={22} />
            </div>
            <div>
              <span className="firma-navbar-company">
                {contrato.razon_social || 'AmeriGlobal S.A.S'}
              </span>
              <span className="firma-navbar-portal-name">
                Portal Oficial de Firma Digital de Contratos
              </span>
            </div>
          </div>

          <div className="firma-legal-badge">
            <ShieldCheck size={16} />
            <span>Validez Legal (Ley 527 de 1999)</span>
          </div>
        </div>
      </header>

      {/* Contenedor principal */}
      <main className="firma-main-content">

        {/* Ficha Resumen del Colaborador y Cargo */}
        <div className="firma-card-colaborador">
          <div className="firma-card-colaborador-top">
            <div>
              <span className="firma-badge-tag">
                Información del Colaborador
              </span>
              <h1 className="firma-colaborador-name">
                {contrato.nombre_trabajador || 'Nombre del Colaborador'}
              </h1>
              <p className="firma-colaborador-doc">
                {contrato.tipo_documento} {contrato.numero_documento}
              </p>
            </div>

            <div className="firma-empleador-box">
              <Building2 size={22} color="#60A5FA" style={{ flexShrink: 0 }} />
              <div>
                <span className="firma-empleador-label">Empleador</span>
                <span className="firma-empleador-text">
                  {contrato.razon_social || 'AmeriGlobal S.A.S'}
                </span>
              </div>
            </div>
          </div>

          <div className="firma-stats-grid">
            <div className="firma-stat-item">
              <span className="firma-stat-label">Cargo a desempeñar</span>
              <span className="firma-stat-value">
                <Briefcase size={15} color="#60A5FA" style={{ flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.3 }}>
                  {contrato.cargo || '—'}
                </span>
              </span>
            </div>

            <div className="firma-stat-item">
              <span className="firma-stat-label">Tipo de Vinculación</span>
              <span className="firma-stat-value" style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.3 }}>
                {tituloContrato}
              </span>
            </div>

            <div className="firma-stat-item">
              <span className="firma-stat-label">
                {esAprendiz ? 'Apoyo de sostenimiento' : 'Salario Básico'}
              </span>
              <span className="firma-stat-value salary">
                <DollarSign size={15} style={{ flexShrink: 0 }} />
                <span>{formatPesos(contrato.salario_base || contrato.salario_monto || contrato.salario)}</span>
              </span>
            </div>

            <div className="firma-stat-item">
              <span className="firma-stat-label">Fecha de Inicio</span>
              <span className="firma-stat-value">
                <Calendar size={15} color="#60A5FA" style={{ flexShrink: 0 }} />
                <span>{contrato.fecha_inicio || contrato.fecha_ingreso || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Visor de Documentos con Pestañas */}
        <div className="firma-card-visor">
          <div className="firma-visor-header">
            <div className="firma-tabs-group">
              <button
                type="button"
                onClick={() => setActiveTab('completo')}
                className={`firma-tab-btn ${activeTab === 'completo' ? 'active' : ''}`}
              >
                Ambos Documentos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('principal')}
                className={`firma-tab-btn ${activeTab === 'principal' ? 'active' : ''}`}
              >
                {esAprendiz ? '1. Contrato Aprendizaje' : '1. Contrato Laboral'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('confidencialidad')}
                className={`firma-tab-btn ${activeTab === 'confidencialidad' ? 'active' : ''}`}
              >
                2. Confidencialidad
              </button>
            </div>

            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              Revisa el documento completo desplazándote hacia abajo
            </span>
          </div>

          {/* Hoja de papel legal con el contenido del contrato */}
          <div className="firma-visor-paper-wrapper">
            <div className="firma-documento-paper">
              <div
                dangerouslySetInnerHTML={{ __html: htmlVisualizar }}
              />
            </div>
          </div>
        </div>

        {/* Sección de Firma Manuscrita */}
        <div className="firma-card-pad">
            <div className="firma-pad-header">
              <div className="firma-pad-icon">
                <FileSignature size={24} />
              </div>
              <div>
                <h3 className="firma-pad-title">
                  Firma Manuscrita del Colaborador
                </h3>
                <p className="firma-pad-subtitle">
                  Esta firma manuscrita digital se aplicará de forma simultánea a tu <strong>Contrato de Trabajo</strong> y a tu <strong>Acuerdo de Confidencialidad</strong>.
                </p>
              </div>
            </div>

            {/* Recuadro Canvas de Firma */}
            <div className="firma-canvas-container">
              <div className="firma-canvas-top-bar">
                <span className="firma-canvas-label">
                  Dibuja tu firma en el recuadro a continuación:
                </span>
                <button
                  type="button"
                  onClick={limpiarFirma}
                  className="firma-btn-limpiar"
                >
                  <RotateCcw size={14} />
                  <span>Borrar y repetir</span>
                </button>
              </div>

              <div className="firma-canvas-box">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="firma-canvas-element"
                />

                <div className="firma-canvas-guide-line">
                  <span>Firma sobre esta línea</span>
                  <span>✕</span>
                </div>

                {firmaVacia && (
                  <div className="firma-canvas-placeholder">
                    ✍️ Usa tu dedo (en celular/tablet) o el mouse para firmar aquí
                  </div>
                )}
              </div>
            </div>

            {/* Casilla de aceptación de términos */}
            <div className="firma-terms-box">
              <label className="firma-terms-label">
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="firma-terms-checkbox"
                />
                <span className="firma-terms-text">
                  He leído detenidamente, comprendo y acepto en su totalidad los términos, obligaciones y cláusulas estipuladas tanto en el <strong>Contrato de Trabajo</strong> como en el <strong>Acuerdo de Confidencialidad</strong>. Declaro bajo la gravedad de juramento que los datos suministrados son fidedignos y que esta firma digital tiene plena validez jurídica conforme a la Ley 527 de 1999 de Colombia.
                </span>
              </label>
            </div>

            {/* Botón de Confirmación y Firma */}
            <div>
              <button
                type="button"
                onClick={handleFirmar}
                disabled={firmando || firmaVacia || !aceptaTerminos}
                className="firma-btn-submit"
              >
                {firmando ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Guardando tu firma en ambos documentos...</span>
                  </>
                ) : (
                  <>
                    <FileSignature size={18} />
                    <span>Firmar y Aceptar Ambos Contratos</span>
                  </>
                )}
              </button>
            </div>
          </div>

      </main>

      {/* Pie de página */}
      <footer className="firma-footer">
        <p style={{ margin: 0, fontWeight: 600 }}>
          Sistema de Gestión de Talento Humano — {contrato.razon_social || 'AmeriGlobal S.A.S'}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748B' }}>
          Documento electrónico con plena validez probatoria legal (Ley 527 de 1999).
        </p>
      </footer>
    </div>
  )
}

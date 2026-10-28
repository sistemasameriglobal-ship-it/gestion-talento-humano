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
  descargarComoWord,
  imprimirContrato,
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
  RotateCcw,
  Download,
  Printer,
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

        {/* Banner de Éxito cuando ya está firmado */}
        {exitoFirma && (
          <div className="firma-banner-success">
            <div className="firma-banner-success-left">
              <div className="firma-banner-success-icon">
                <FileCheck2 size={26} />
              </div>
              <div>
                <h2 className="firma-banner-success-title">
                  ¡Contratos Legalizados y Firmados!
                </h2>
                <p className="firma-banner-success-desc">
                  Tu firma digital fue estampada exitosamente en el <strong>Contrato Laboral</strong> y en el <strong>Acuerdo de Confidencialidad</strong> el <strong>{contrato.fecha_firma_trabajador || 'Fecha registrada'}</strong>.
                </p>
              </div>
            </div>

            {/* Botones de descarga y consulta */}
            <div className="firma-download-actions">
              <button
                type="button"
                onClick={() => descargarComoWord(contrato, 'principal')}
                className="firma-btn-download"
                title="Descargar Contrato Laboral en Word"
              >
                <Download size={14} color="#60A5FA" />
                <span>Contrato (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => descargarComoWord(contrato, 'confidencialidad')}
                className="firma-btn-download"
                title="Descargar Acuerdo de Confidencialidad en Word"
              >
                <Download size={14} color="#FBBF24" />
                <span>Confidencialidad (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => imprimirContrato(contrato, 'completo')}
                className="firma-btn-print"
                title="Imprimir o guardar como PDF"
              >
                <Printer size={14} />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        )}

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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contrato.cargo || '—'}
                </span>
              </span>
            </div>

            <div className="firma-stat-item">
              <span className="firma-stat-label">Tipo de Vinculación</span>
              <span className="firma-stat-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                1. Contrato Laboral
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

        {/* Sección de Firma Manuscrita (Solo si no ha sido firmado) */}
        {!exitoFirma ? (
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
        ) : (
          /* Card mostrando la firma registrada */
          <div className="firma-card-registrada">
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={18} color="#34D399" />
              <span>Firma Digital Registrada en Expediente</span>
            </h3>

            <div className="firma-card-registrada-content">
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Firmado por:</p>
                <p style={{ margin: '2px 0 8px 0', fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>{contrato.nombre_trabajador}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Identificación:</p>
                <p style={{ margin: '2px 0 8px 0', fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{contrato.tipo_documento} {contrato.numero_documento}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Fecha y hora de registro:</p>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 700, color: '#34D399' }}>{contrato.fecha_firma_trabajador || 'Fecha registrada'}</p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Estampa de firma manuscrita:</span>
                <div className="firma-stamp-img-box">
                  {contrato.firma_trabajador ? (
                    <img
                      src={contrato.firma_trabajador}
                      alt="Firma del colaborador"
                      className="firma-stamp-img"
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>Firma registrada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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

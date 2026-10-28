// =============================================================
// src/components/contratos/ModalCompartirFirma.jsx
// -------------------------------------------------------------
// Modal para compartir el enlace único de firma digital al empleado
// Permite copiar el enlace, enviarlo por WhatsApp o abrirlo.
// =============================================================

import { useState, useRef } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  FileSignature,
  FileCheck2,
  AlertCircle,
  User,
  Briefcase,
  X
} from 'lucide-react'
import './modalCompartirFirma.css'

export default function ModalCompartirFirma({ contrato, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const inputRef = useRef(null)

  if (!contrato) return null

  // Construir URL limpia para el portal de firma
  const cid = contrato.id || contrato.contrato_id || ''
  const origin = window.location.origin
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const enlaceFirma = `${origin}${pathname}/#/firmar-contrato/${cid}`

  const yaFirmado = Boolean(contrato.firmado_por_trabajador || contrato.firma_trabajador)
  const esLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // Mensaje para WhatsApp
  const mensajeWhatsApp = `Hola ${contrato.nombre_trabajador || ''}, te compartimos el enlace oficial para la revisión y firma digital de tu Contrato Laboral y Acuerdo de Confidencialidad con ${contrato.razon_social || 'AmeriGlobal'}:\n\n${enlaceFirma}\n\nPuedes firmarlo fácilmente desde tu celular o computador con tu dedo o mouse.`

  // URL WhatsApp
  const telefonoLimpio = contrato.telefono ? contrato.telefono.replace(/\D/g, '') : ''
  const urlWhatsApp = telefonoLimpio
    ? `https://api.whatsapp.com/send?phone=57${telefonoLimpio}&text=${encodeURIComponent(mensajeWhatsApp)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensajeWhatsApp)}`

  const handleCopiarEnlace = async () => {
    let copiadoConExito = false

    // 1. Prioridad: navigator.clipboard (estándar moderno)
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(enlaceFirma)
        copiadoConExito = true
      } catch (err) {
        console.warn('Fallo navigator.clipboard.writeText, probando input:', err)
      }
    }

    // 2. Método B: Usar el input visible del DOM dentro del modal
    if (!copiadoConExito && inputRef.current) {
      try {
        inputRef.current.focus()
        inputRef.current.select()
        inputRef.current.setSelectionRange(0, 99999)
        copiadoConExito = document.execCommand('copy')
      } catch (err) {
        console.warn('Fallo execCommand en inputRef:', err)
      }
    }

    // 3. Método C: Textarea auxiliar
    if (!copiadoConExito) {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = enlaceFirma
        textArea.style.position = 'fixed'
        textArea.style.top = '0'
        textArea.style.left = '0'
        textArea.style.width = '2em'
        textArea.style.height = '2em'
        textArea.style.padding = '0'
        textArea.style.border = 'none'
        textArea.style.outline = 'none'
        textArea.style.boxShadow = 'none'
        textArea.style.background = 'transparent'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        copiadoConExito = document.execCommand('copy')
        document.body.removeChild(textArea)
      } catch (err) {
        console.error('Error al copiar al portapapeles:', err)
      }
    }

    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const handleAbrirPortal = () => {
    window.open(enlaceFirma, '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatedModal
      open={Boolean(contrato)}
      onRequestClose={onClose}
      maxWidth="580px"
      modalStyle={{
        width: '94vw',
        maxWidth: '580px',
        padding: '24px',
        borderRadius: '16px',
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
      }}
    >
      <div className="modal-firma-wrapper">
        {/* Encabezado con título y botón cerrar */}
        <div className="modal-firma-header">
          <div className="modal-firma-title-group">
            <div className="modal-firma-icon-badge">
              <Link2 size={22} />
            </div>
            <div>
              <h3 className="modal-firma-title">
                Compartir Enlace de Firma Digital
              </h3>
              <p className="modal-firma-subtitle">
                Para firma de Contrato Laboral y Confidencialidad
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-firma-btn-close"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Banner superior de estado */}
        {yaFirmado ? (
          <div className="modal-firma-status-banner success">
            <div className="modal-firma-status-icon">
              <FileCheck2 size={20} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '13px' }}>¡Contrato firmado digitalmente!</strong>
              <span style={{ fontSize: '11.5px', opacity: 0.9 }}>
                Registrado el {contrato.fecha_firma_trabajador || 'Fecha registrada'}. El enlace sigue activo para consulta.
              </span>
            </div>
          </div>
        ) : (
          <div className="modal-firma-status-banner pending">
            <div className="modal-firma-status-icon">
              <FileSignature size={20} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '13px' }}>Firma simultánea de ambos contratos</strong>
              <span style={{ fontSize: '11.5px', opacity: 0.9 }}>
                El empleado firma en un solo paso el <strong>Contrato de Trabajo</strong> y el <strong>Acuerdo de Confidencialidad</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Resumen del colaborador */}
        <div className="modal-firma-colaborador-card">
          <div className="modal-firma-colaborador-row">
            <User size={14} color="#64748b" />
            <span>Colaborador: <strong>{contrato.nombre_trabajador || '—'}</strong></span>
          </div>
          <div className="modal-firma-colaborador-row">
            <Briefcase size={14} color="#64748b" />
            <span>Cargo: <strong>{contrato.cargo || '—'}</strong></span>
          </div>
          <div className="modal-firma-colaborador-row">
            <span>Doc: <strong>{contrato.tipo_documento} {contrato.numero_documento}</strong></span>
          </div>
          <div className="modal-firma-colaborador-row">
            <span>Empresa: <strong>{contrato.razon_social || 'AmeriGlobal'}</strong></span>
          </div>
        </div>

        {/* Campo con URL para copiar */}
        <div className="modal-firma-link-section">
          <label className="modal-firma-label">
            Enlace directo para el colaborador
          </label>
          <div className="modal-firma-link-box">
            <div className="modal-firma-input-container">
              <Link2 size={16} className="modal-firma-input-icon" />
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={enlaceFirma}
                onClick={e => {
                  e.target.select()
                  handleCopiarEnlace()
                }}
                className="modal-firma-input"
                title="Haz clic para seleccionar y copiar automáticamente"
              />
            </div>

            <button
              type="button"
              onClick={handleCopiarEnlace}
              className={`modal-firma-btn-copy ${copiado ? 'copied' : ''}`}
            >
              {copiado ? (
                <>
                  <Check size={16} />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copiar enlace</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Botones de acción rápida: WhatsApp y Abrir */}
        <div className="modal-firma-actions-grid">
          <a
            href={urlWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-firma-btn-whatsapp"
          >
            <MessageCircle size={18} fill="#ffffff" />
            <span>Enviar por WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleAbrirPortal}
            className="modal-firma-btn-open"
          >
            <ExternalLink size={17} color="#2563EB" />
            <span>Abrir portal de firma</span>
          </button>
        </div>

        {/* Nota para desarrollo local */}
        {esLocalhost && (
          <div className="modal-firma-alert-local">
            <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Modo desarrollo local (localhost):</strong> Puedes probar el portal directamente en tu navegador con <strong>"Abrir portal de firma"</strong>. Si deseas abrirlo desde un celular, conéctalo al mismo Wi-Fi y usa la IP de tu PC.
            </div>
          </div>
        )}

        {/* Garantía legal y seguridad */}
        <div className="modal-firma-legal-footer">
          <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
          <span>
            Firma electrónica legal conforme a la <strong>Ley 527 de 1999</strong> de Colombia.
          </span>
        </div>

        {/* Pie con botón de cerrar */}
        <div className="modal-firma-footer-actions">
          <button
            type="button"
            onClick={onClose}
            className="modal-firma-btn-close-action"
          >
            Cerrar
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}

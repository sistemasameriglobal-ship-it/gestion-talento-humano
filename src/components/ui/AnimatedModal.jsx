// =============================================================
// src/components/ui/AnimatedModal.jsx
// -------------------------------------------------------------
// Modal con transición suave de entrada/salida (fade + scale).
// Compartido por todos los módulos (antes había copias con
// prefijos de keyframes por feature).
// =============================================================
import { useState, useEffect } from 'react'
import './ui.css'

export default function AnimatedModal({ open, onRequestClose, maxWidth, backdropStyle, modalStyle, children }) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [frozen, setFrozen] = useState(children)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setFrozen(children)
        setMounted(true)
        setClosing(false)
      })
    } else if (mounted) {
      Promise.resolve().then(() => setClosing(true))
      const t = setTimeout(() => { setMounted(false); setClosing(false) }, 160)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) Promise.resolve().then(() => setFrozen(children))
  }, [children, open])

  if (!mounted) return null

  return (
    <div
      className="modal-backdrop"
      style={{
        animation: `${closing ? 'uiBackdropOut' : 'uiBackdropIn'} 0.18s ease forwards`,
        ...(backdropStyle || {})
      }}
      onClick={e => { if (e.target === e.currentTarget) onRequestClose() }}
    >
      <div
        className="modal"
        style={{
          ...(maxWidth ? { maxWidth } : {}),
          ...(modalStyle || {}),
          animation: `${closing ? 'uiModalOut' : 'uiModalIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
        {frozen}
      </div>
    </div>
  )
}
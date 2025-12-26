
import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import './Modal.css'

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - children: ReactNode
 *  - ariaLabel?: string
 *  - usePortal?: boolean (default: true)
 */
export default function Modal({
  open,
  onClose,
  children,
  ariaLabel = 'Dialog',
  usePortal = true,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  if (!open) return null

  const content = (
    <div
      className="modal-backdrop"
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="modal-panel">
        {children}
      </div>
    </div>
  )

  if (usePortal && typeof document !== 'undefined') {
    return ReactDOM.createPortal(content, document.body)
  }
  return content
}
``

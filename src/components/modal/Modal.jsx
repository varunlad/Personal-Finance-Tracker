
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
  // Lock background scroll when modal is open
  useEffect(() => {
    if (!open) return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight

    // Compute scrollbar width to avoid layout shift
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`
    }

    // Prevent touch scroll behind modal (iOS & Android)
    const preventTouchScroll = (e) => {
      // If the touch is on the backdrop or outside the modal panel, prevent
      // (allow inner content to scroll if it overflows)
      const backdrop = document.querySelector('.modal-backdrop')
      const panel = document.querySelector('.modal-panel')
      if (!backdrop || !panel) return
      // If target is within panel, allow; otherwise prevent
      if (!panel.contains(e.target)) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchmove', preventTouchScroll, { passive: false })

    return () => {
      // Restore styles
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      document.removeEventListener('touchmove', preventTouchScroll)
    }
  }, [open])

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

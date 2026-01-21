import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Toast.css";

const ToastContext = createContext(null);
let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = idSeq++;
    const toast = { id, type, message };
    setToasts((prev) => [...prev, toast]);
    const ttl = typeof opts.duration === "number" ? opts.duration : 2500;
    const tm = setTimeout(() => remove(id), ttl);
    timersRef.current.set(id, tm);
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    success: (msg, opts) => push("success", msg, opts),
    error:   (msg, opts) => push("error",   msg, opts),
    info:    (msg, opts) => push("info",    msg, opts),
    remove,
  }), [push, remove]);

  useEffect(() => () => {
    for (const tm of timersRef.current.values()) clearTimeout(tm);
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              <div className="toast__msg">{t.message}</div>
              <button className="toast__close" onClick={() => api.remove(t.id)} aria-label="Close">×</button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

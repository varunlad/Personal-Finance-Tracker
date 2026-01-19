
// src/components/loader/Loader.jsx
import { useEffect, useRef, useState } from "react";
import "./loader.css";

/**
 * Smooth Loader (Uiverse triple-loader variant) with fade-in/out
 * and minimum visibility window.
 *
 * Props:
 *  - visible: boolean (required)
 *  - minDuration?: number (ms)  → minimum time the loader stays visible (default 450)
 *  - enterDelay?: number (ms)   → delay before showing loader (default 120)
 *  - label?: string             → optional accessible label
 *  - className?: string         → extra classes for the wrapper
 */
export default function Loader({
  visible,
  minDuration = 450,
  enterDelay = 120,
  label = "",
  className = "",
}) {
  const [shouldRender, setShouldRender] = useState(false); // mounted?
  const [show, setShow] = useState(false);                 // visible (fade state)
  const appearTimerRef = useRef(null);
  const minTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    // cleanup timers on unmount/change
    return () => {
      clearTimeout(appearTimerRef.current);
      clearTimeout(minTimerRef.current);
      clearTimeout(unmountTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      clearTimeout(unmountTimerRef.current);

      if (shouldRender) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
        return;
      }

      // Delay to avoid flicker for ultra-fast operations
      appearTimerRef.current = setTimeout(() => {
        setShouldRender(true);
        mountedAtRef.current = Date.now();
        requestAnimationFrame(() => setShow(true));
      }, enterDelay);
    } else {
      clearTimeout(appearTimerRef.current);

      const elapsed = Date.now() - mountedAtRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      // Wait remaining minDuration before starting fade-out
      minTimerRef.current = setTimeout(() => {
        setShow(false);

        // Keep this in sync with CSS --transition-duration
        const TRANSITION_MS = 300;
        unmountTimerRef.current = setTimeout(() => {
          setShouldRender(false);
        }, TRANSITION_MS);
      }, remaining);
    }
  }, [visible, shouldRender, enterDelay, minDuration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`loader-wrapper ${show ? "loader-show" : "loader-hide"} ${className}`}
      aria-live="polite"
      aria-busy={show}
      role="status"
    >
      {/* Uiverse triple-loader structure */}
      <div className="container" aria-hidden="true">
        <div className="loader" />
        <div className="loader" />
        <div className="loader" />
      </div>

      {/* Accessible label (screen readers) */}
      <span className="loader-label">{label}</span>
    </div>
  );
}

// src/components/loader/Loader.jsx
import { useEffect, useRef, useState } from "react";
import "./Loader.css";

/**
 * Smooth Loader with fade-in/out and minimum visibility window.
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
  label = "Loading…",
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
    // When visible becomes true → mount after enterDelay and fade in
    if (visible) {
      clearTimeout(unmountTimerRef.current);

      // If already rendering, just ensure 'show' is true
      if (shouldRender) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
        return;
      }

      // Delay to avoid ultra-fast flicker
      appearTimerRef.current = setTimeout(() => {
        setShouldRender(true);
        mountedAtRef.current = Date.now();

        // Next frame → set show=true to trigger CSS transition
        requestAnimationFrame(() => setShow(true));
      }, enterDelay);
    } else {
      // visible became false → fade out, but respect minDuration
      clearTimeout(appearTimerRef.current);

      const elapsed = Date.now() - mountedAtRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      // Wait remaining minDuration before starting fade-out
      minTimerRef.current = setTimeout(() => {
        // trigger fade-out
        setShow(false);

        // after CSS transition duration, unmount
        // keep in sync with CSS --transition-duration (300ms)
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
      {/* spinner box */}
      <div className="loader">
        {/* Decorative spinner uses ::before/::after from CSS */}
      </div>

      {/* Accessible label (optional) */}
      <span className="loader-label">{label}</span>
    </div>
  );
}

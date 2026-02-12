import { useEffect, useRef, useState } from "react";

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Tween a single number smoothly */
export function useTweenedNumber(
  target,
  { duration = 800, ease = easeOutCubic } = {}
) {
  const [value, setValue] = useState(Number(target) || 0);
  const fromRef = useRef(value);
  const toRef = useRef(Number(target) || 0);
  const rafRef = useRef();

  useEffect(() => {
    const from = (fromRef.current = value);
    const to = (toRef.current = Number(target) || 0);
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);
    const loop = (now) => {
      const t = clamp01((now - start) / duration);
      const v = from + (to - from) * ease(t);
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

/** Tween an array of numbers (assumes stable order) */
export function useTweenedArray(
  targetArr,
  { duration = 900, ease = easeOutCubic } = {}
) {
  const numericTarget = Array.isArray(targetArr)
    ? targetArr.map((n) => Number(n) || 0)
    : [];
  const [values, setValues] = useState(numericTarget);
  const rafRef = useRef();

  useEffect(() => {
    const from = values;
    const to = numericTarget;
    const maxLen = Math.max(from.length, to.length);
    const f = Array.from({ length: maxLen }, (_, i) => Number(from[i]) || 0);
    const t = Array.from({ length: maxLen }, (_, i) => Number(to[i]) || 0);
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);
    const loop = (now) => {
      const tt = clamp01((now - start) / duration);
      const eased = ease(tt);
      // IMPORTANT: compute against maxLen but TRIM to the target length
      const next = f.map((fv, i) => fv + (t[i] - fv) * eased).slice(0, to.length);
      setValues(next);
      if (tt < 1) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(numericTarget), duration]);

  return values;
}
``
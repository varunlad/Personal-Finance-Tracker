// src/features/editor-bus.js
// Very small pub/sub so components can ask the editor to open for a date.

const listeners = new Set();

/**
 * Subscribe to "open editor" events.
 * @param {(date: Date) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onRequestOpenEditor(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/**
 * Request that the editor open for a given JS Date.
 * ExpenseAnalysis will decide how to handle it (switch month if needed, etc.)
 * @param {Date} date
 */
export function requestOpenEditor(date) {
  for (const cb of listeners) {
    try {
      cb(date);
    } catch {
      // no-op
    }
  }
}
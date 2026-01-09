import { useEffect, useMemo, useState } from "react";
import CategoryChartSwitcher from "./CategoryChartSwitcher";
import "./expenseSummary.css";

import { useAuth } from "../../context/auth-context";
import { listRangeExpenses } from "../../api/expenses";
import Loader from "../loader/Loader";

/* ---------- Local-safe helpers for <input type="date"> ---------- */
function parseInputDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d); // local date (no UTC shift)
}
function toInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatYMD(date) {
  return toYMD(date);
}

/**
 * ExpenseSummary
 * - Fetches and shows summary for an arbitrary date range (server-side).
 * - Does not mutate parent state or other components.
 *
 * Props:
 *  - dayGroups?: Array (ignored here; kept for compatibility with parent)
 *  - minSelectableDate?: Date (default: 2000-01-01) — allows picking back years
 *  - maxSelectableDate?: Date (default: today)
 */
export default function ExpenseSummary({
  minSelectableDate = new Date(2000, 0, 1),
  maxSelectableDate,
}) {
  const { token } = useAuth(); // JWT from AuthProvider
  const today = new Date();

  // Clamp bounds for date inputs
  const minDate = minSelectableDate;
  const maxDate =
    maxSelectableDate ??
    new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Default: current year (YTD)
  const ytdStart = new Date(today.getFullYear(), 0, 1);
  const [pendingStart, setPendingStart] = useState(ytdStart);
  const [pendingEnd, setPendingEnd] = useState(today);

  // Applied range (last successful selection) — used in messages
  const [appliedStart, setAppliedStart] = useState(ytdStart);
  const [appliedEnd, setAppliedEnd] = useState(today);

  // Data returned by BACKEND for the applied range
  const [rangeGroups, setRangeGroups] = useState([]); // [{date, items, total}]
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onPendingStartChange(e) {
    const next = parseInputDate(e.target.value);
    setPendingStart(next);
    setError(
      next > pendingEnd ? "Start date cannot be later than end date." : ""
    );
  }

  function onPendingEndChange(e) {
    const next = parseInputDate(e.target.value);
    setPendingEnd(next);
    setError(
      pendingStart > next ? "End date cannot be earlier than start date." : ""
    );
  }

  async function handleApply() {
    if (pendingStart > pendingEnd) {
      setError("Invalid date range: Start must be earlier than End.");
      return;
    }
    // Clamp once for safety against input bounds
    const start = new Date(
      Math.max(
        minDate.getTime(),
        Math.min(pendingStart.getTime(), maxDate.getTime())
      )
    );
    const end = new Date(
      Math.max(
        minDate.getTime(),
        Math.min(pendingEnd.getTime(), maxDate.getTime())
      )
    );

    setAppliedStart(start);
    setAppliedEnd(end);
    setError("");

    if (!token) {
      setError("You must be logged in to fetch summary data.");
      return;
    }

    setLoading(true);
    try {
      const startStr = toYMD(start);
      const endStr = toYMD(end);
      const data = await listRangeExpenses({
        start: startStr,
        end: endStr,
        token,
      });
      const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
      setRangeGroups(sorted);
    } catch (err) {
      setError(err.message || "Failed to fetch range summary");
      setRangeGroups([]);
    } finally {
      setLoading(false);
    }
  }

  // 🚀 Auto-fetch current YTD on mount or when token becomes available
  useEffect(() => {
    let cancelled = false;

    async function fetchYTD() {
      // Build YTD range
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      setAppliedStart(start);
      setAppliedEnd(end);
      setPendingStart(start);
      setPendingEnd(end);
      setError("");

      if (!token) return; // wait until logged in

      setLoading(true);
      try {
        const startStr = toYMD(start);
        const endStr = toYMD(end);
        const data = await listRangeExpenses({
          start: startStr,
          end: endStr,
          token,
        });
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        if (!cancelled) setRangeGroups(sorted);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Failed to fetch current year-to-date summary"
          );
          setRangeGroups([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchYTD();

    return () => {
      cancelled = true;
    };
    // Re-run when token changes (e.g., user logs in)
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chart inputs from returned RANGE
  const { labels, values, total } = useMemo(() => {
    const totalsMap = new Map(); // category -> sum
    let grand = 0;

    for (const g of rangeGroups) {
      const items = Array.isArray(g.items) ? g.items : [];
      for (const it of items) {
        const c = String(it.category || "other").toLowerCase();
        const amt = Number(it.amount) || 0;
        totalsMap.set(c, (totalsMap.get(c) || 0) + amt);
        grand += amt;
      }
    }
    return {
      labels: Array.from(totalsMap.keys()),
      values: Array.from(totalsMap.values()).map((v) => Number(v) || 0),
      total: grand,
    };
  }, [rangeGroups]);

  // Input values
  const pendingStartStr = toInputValue(pendingStart);
  const pendingEndStr = toInputValue(pendingEnd);
  const minStr = toInputValue(minDate);
  const maxStr = toInputValue(maxDate);

  const isDark = document.body.classList.contains("theme-dark");

  return (
    <section className="expense-summary card" aria-busy={loading}>
      {/* Range controls */}
      <div className="date-row">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label className="date-field" aria-label="Start date">
            <input
              type="date"
              lang="en-GB"
              value={pendingStartStr}
              min={minStr}
              max={maxStr}
              onChange={onPendingStartChange}
            />
          </label>

          <span className="sep">-</span>

          <label className="date-field" aria-label="End date">
            <input
              type="date"
              lang="en-GB"
              value={pendingEndStr}
              min={minStr}
              max={maxStr}
              onChange={onPendingEndChange}
            />
          </label>
        </div>

        <div className="date-actions">
          <button
            className="btn primary"
            onClick={handleApply}
            disabled={!!error || loading}
            aria-label="Apply selected date range"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="summary-loader" aria-live="polite">
          <Loader visible={loading} minDuration={300} enterDelay={50} />{" "}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="inline-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Content */}
      {rangeGroups.length === 0 && !loading ? (
        <div className="empty-state">
          <h3>No expense data in this range</h3>
          <p className="muted">
            Try expanding the range {formatYMD(appliedStart)} →{" "}
            {formatYMD(appliedEnd)}, or ensure expenses exist for the selected
            period.
          </p>
        </div>
      ) : !loading ? (
        <CategoryChartSwitcher
          labels={labels}
          values={values}
          totalVal={total}
          // colors can be customized; using a palette with your primary first
          colors={[
            "#0984E3",
            "#114e08ff",
            "#df0ccdff",
            "#0bbd4fff",
            "#D63031",
            "#e05e08ff",
          ]}
          themeMode={isDark ? "dark" : "light"}
          currencySymbol="₹"
          defaultType="pie"
        />
      ) : null}
    </section>
  );
}

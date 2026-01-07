import { useMemo, useState } from "react";
import {
  filterByCustomRange,
  categoryTotalsMap,
} from "../../utils/expenseUtils";
import CategoryChartSwitcher from "./CategoryChartSwitcher";
import "./expenseSummary.css";
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

export default function ExpenseSummary({ dayGroups }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = new Date();

  // Allow selection from earliest data date (so last year is not blocked).
  const earliestDataDate = useMemo(() => {
    if (!dayGroups || dayGroups.length === 0) {
      // Fallback: allow at least last year
      return new Date(today.getFullYear() - 1, 0, 1);
    }
    const dates = dayGroups.map((g) => {
      const [y, m, d] = g.date.split("-").map(Number);
      return new Date(y, m - 1, d); // local date
    });
    return dates.reduce((min, d) => (d < min ? d : min), dates[0]);
  }, [dayGroups, today]);

  const minDate = earliestDataDate;
  const maxDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ); // local "today"

  // Default: current year (YTD)
  const ytdStart = new Date(today.getFullYear(), 0, 1);
  const [pendingStart, setPendingStart] = useState(ytdStart);
  const [pendingEnd, setPendingEnd] = useState(today);
  const [appliedStart, setAppliedStart] = useState(ytdStart);
  const [appliedEnd, setAppliedEnd] = useState(today);
  const [error, setError] = useState("");

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

  function handleApply() {
    if (pendingStart > pendingEnd) {
      setError("Invalid date range: Start must be earlier than End.");
      return;
    }
    // Clamp once for safety
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
  }

  // Build chart inputs from APPLIED range
  const { labels, values, total } = useMemo(() => {
    const filtered = filterByCustomRange(dayGroups, appliedStart, appliedEnd);
    const totalsMap = categoryTotalsMap(filtered);
    const vals = Array.from(totalsMap.values()).map((v) => Number(v) || 0);
    return {
      labels: Array.from(totalsMap.keys()),
      values: vals,
      total: vals.reduce((a, b) => a + b, 0),
    };
  }, [dayGroups, appliedStart, appliedEnd]);

  // Input values
  const pendingStartStr = toInputValue(pendingStart);
  const pendingEndStr = toInputValue(pendingEnd);
  const minStr = toInputValue(minDate);
  const maxStr = toInputValue(maxDate);

  const isDark = document.body.classList.contains("theme-dark");

  return (
    <section className="expense-summary card">
      <header className="summary-header">
        <h2 className="card-title">Expense Summary</h2>
      </header>

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
        <div className="date-actions btn-row">
          <button
            className="btn primary"
            onClick={handleApply}
            disabled={!!error}
          >
            Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="inline-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {values.length === 0 ? (
        <div className="empty-state">
          <h3>No expense data in this range</h3>
          <p className="muted">
            Try expanding the range, or ensure expenses exist for the selected
            period.
          </p>
        </div>
      ) : (
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
      )}
    </section>
  );
}

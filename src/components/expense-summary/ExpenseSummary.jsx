import { useEffect, useMemo, useRef, useState } from "react";
import CategoryChartSwitcher from "./CategoryChartSwitcher";
import BudgetAdvisorPanel from "./BudgetAdvisorPanel";
import "./expensesummary.css";

import { useAuth } from "../../context/auth-context";
import { listRangeExpenses } from "../../api/expenses";
import Loader from "../loader/Loader";
import { useTweenedArray, useTweenedNumber } from "../../hooks/useTween";

/* ---------- Local-safe helpers for <input type="date"> ---------- */
function parseInputDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
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

/** Map raw backend category to a pretty label (no lowercasing of certain labels) */
function toPrettyLabel(raw) {
  const s = String(raw || "").trim();
  if (s === "Credit Card") return "Credit Card";
  if (s === "EMIs") return "EMIs";
  const l = s.toLowerCase();
  if (l.includes("mutual")) return "Mutual Fund";
  if (l.includes("stock")) return "Stocks";
  if (l.includes("shop")) return "Shopping";
  if (l.includes("groc")) return "Grocery";
  if (l.includes("rent") || l.includes("bill")) return "Rent/Bills";
  if (s === "other" || s === "Other") return "Other";
  // Fallback to raw
  return s || "Other";
}

/**
 * ExpenseSummary
 * Props:
 *  - monthlySalary (number): REQUIRED for advisor panel; no input UI.
 *  - minSelectableDate?: Date
 *  - maxSelectableDate?: Date
 *  - currencySymbol?: string (default "₹")
 *  - autoFetchOnMount?: boolean (default false) — if true, loads YTD automatically.
 */
export default function ExpenseSummary({
  monthlySalary,
  minSelectableDate = new Date(2000, 0, 1),
  maxSelectableDate,
  currencySymbol = "₹",
  autoFetchOnMount = false,
}) {
  const { token } = useAuth();
  const today = new Date();

  // Controls how long loader stays at minimum (for perceived "AI" processing)
  const MIN_LOADER_MS = 1000;

  // Clamp bounds for date inputs
  const minDate = minSelectableDate;
  const maxDate =
    maxSelectableDate ??
    new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Default: current year (YTD)
  const ytdStart = new Date(today.getFullYear(), 0, 1);
  const [pendingStart, setPendingStart] = useState(ytdStart);
  const [pendingEnd, setPendingEnd] = useState(today);

  const [appliedStart, setAppliedStart] = useState(ytdStart);
  const [appliedEnd, setAppliedEnd] = useState(today);

  const [rangeGroups, setRangeGroups] = useState([]); // [{date, items, total}]
  const [error, setError] = useState("");

  const [fetching, setFetching] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // prevent auto-fetch if not desired
  const firstLoadRef = useRef(true);

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

    setFetching(true);
    setContentReady(false);
    const t0 = Date.now();

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

      const elapsed = Date.now() - t0;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        setContentReady(true);
        setFetching(false);
      }, remaining);
    } catch (err) {
      setError(err?.message || "Failed to fetch range summary");
      setRangeGroups([]);

      const elapsed = Date.now() - t0;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        setContentReady(false);
        setFetching(false);
      }, remaining);
    }
  }

  // Optional: Auto-fetch YTD on mount/token IF explicitly enabled
  useEffect(() => {
    if (!autoFetchOnMount) return;
    let cancelled = false;
    if (firstLoadRef.current) firstLoadRef.current = false;

    async function fetchYTD() {
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

      if (!token) return;

      setFetching(true);
      setContentReady(false);
      const t0 = Date.now();

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

        const elapsed = Date.now() - t0;
        const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
        setTimeout(() => {
          if (cancelled) return;
          setContentReady(true);
          setFetching(false);
        }, remaining);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message || "Failed to fetch current year-to-date summary"
          );
          setRangeGroups([]);
        }
        const elapsed = Date.now() - t0;
        const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
        setTimeout(() => {
          if (cancelled) return;
          setContentReady(false);
          setFetching(false);
        }, remaining);
      }
    }

    fetchYTD();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, autoFetchOnMount]);

  // Build chart inputs: keyed by PRETTY LABELS to keep "Credit Card" / "EMIs" intact
  const { labels, values, total } = useMemo(() => {
    const totalsMap = new Map(); // prettyLabel -> sum
    let grand = 0;

    for (const g of rangeGroups) {
      const items = Array.isArray(g.items) ? g.items : [];
      for (const it of items) {
        const label = toPrettyLabel(it.category);
        const amt = Number(it.amount) || 0;
        totalsMap.set(label, (totalsMap.get(label) || 0) + amt);
        grand += amt;
      }
    }
    return {
      labels: Array.from(totalsMap.keys()),
      values: Array.from(totalsMap.values()).map((v) => Number(v) || 0),
      total: grand,
    };
  }, [rangeGroups]);

  // Tweened “display” layer — only once content is ready
  const tweenedValues = useTweenedArray(
    !fetching && contentReady ? values : [],
    {
      duration: 900,
    }
  );
  const tweenedTotal = useTweenedNumber(!fetching && contentReady ? total : 0, {
    duration: 900,
  });

  // For advisor: build categoryTotals based on tweened values
  const displayedCategoryTotals = useMemo(() => {
    const map = new Map();
    labels.forEach((l, i) => map.set(l, Number(tweenedValues[i]) || 0));
    return Object.fromEntries(map);
  }, [labels, tweenedValues]);

  const pendingStartStr = toInputValue(pendingStart);
  const pendingEndStr = toInputValue(pendingEnd);
  const minStr = toInputValue(minDate);
  const maxStr = toInputValue(maxDate);

  const isDark =
    typeof document !== "undefined" &&
    document.body?.classList?.contains("theme-dark");

  return (
    <section className="expense-summary card" aria-busy={fetching}>
      <div className="summary-header">
        <h3 className="card-title">Expense Summary</h3>
      </div>

      {/* Range controls (Apply button inline on desktop) */}
      <div className="date-row">
        <div className="date-inline">
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

          <button
            className="btn primary apply-btn"
            onClick={handleApply}
            disabled={!!error || fetching}
            aria-label="Apply selected date range"
          >
            {fetching ? "..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Loader */}
      {fetching && (
        <div className="summary-loader" aria-live="polite">
          <Loader visible={true} minDuration={300} enterDelay={50} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="inline-error" aria-live="assertive">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Content */}
      {!fetching && contentReady ? (
        rangeGroups.length === 0 ? (
          <div className="empty-state">
            <h3>No expense data in this range</h3>
            <p className="muted">
              Try expanding the range {formatYMD(appliedStart)} →{" "}
              {formatYMD(appliedEnd)}, or ensure expenses exist for the selected
              period.
            </p>
          </div>
        ) : (
          <div className={`summary-grid show`}>
            <CategoryChartSwitcher
              labels={labels}
              values={tweenedValues}
              totalVal={tweenedTotal}
              colors={[
                "#53A9EB", // Mutual Fund
                "#588352FF", // Stocks
                "#E955DCFF", // Shopping
                "#54D184FF", // Grocery
                "#E26E6F", // Other
                "#E98E52FF", // Rent/Bills
                "#6366F1", // Credit Card
                "#c55cdfff", // EMIs
              ]}
              themeMode={isDark ? "dark" : "light"}
              currencySymbol={currencySymbol}
              defaultType="pie"
            />

            <BudgetAdvisorPanel
              categoryTotals={displayedCategoryTotals}
              total={tweenedTotal}
              currencySymbol={currencySymbol}
              monthlySalary={Number(monthlySalary) || 0}
              rangeStart={appliedStart}
              rangeEnd={appliedEnd}
            />
          </div>
        )
      ) : null}
    </section>
  );
}

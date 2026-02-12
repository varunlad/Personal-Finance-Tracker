import { useMemo, useState } from "react";
import { formatINR } from "../../utils/expenseUtils";

/**
 * Props
 * - categoryTotals: Record<PrettyLabel, number>
 * - total: number (range total, tweened)  ← range spend
 * - currencySymbol: string
 * - monthlySalary: number  ← user's nominal monthly salary (e.g., 80k)
 * - rangeStart: Date       ← selected range start
 * - rangeEnd: Date         ← selected range end (inclusive by UI)
 * - title?: string
 */
export default function BudgetAdvisorPanel({
  categoryTotals = {},
  total = 0,
  currencySymbol = "₹",
  monthlySalary = 0,
  title = "Smart Budget Advisor",
  rangeStart,
  rangeEnd,
}) {
  // helpers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fmt = (n, sym = currencySymbol) => formatINR(Math.round(n || 0), sym);
  const pct = (part, whole) =>
    whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;

  // Salary show/hide toggle (hidden by default)
  const [showSalary, setShowSalary] = useState(false);

  /** ---------- Date helpers for pro‑rating ---------- */
  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  function daysBetweenInclusive(a, b) {
    // Normalize to midnight to avoid DST issues
    const d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((d1 - d0) / (24 * 3600 * 1000)) + 1;
  }

  /**
   * Pro‑rate a fixed monthly salary over an arbitrary date range.
   * For each month overlapped by [start, end], we:
   *  - find the overlap days within that month
   *  - compute fraction = overlapDays / daysInThatMonth
   *  - add fraction * monthlySalary
   */
  function getProratedIncomeForRange(monthlySalary, start, end) {
    const m = Number(monthlySalary) || 0;
    if (m <= 0 || !(start instanceof Date) || !(end instanceof Date)) return 0;
    if (end < start) return 0;

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    let totalIncome = 0;

    while (cursor <= lastMonth) {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);

      // overlap within [start, end]
      const segStart = new Date(
        Math.max(
          monthStart.getTime(),
          new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
          ).getTime()
        )
      );
      const segEnd = new Date(
        Math.min(
          monthEnd.getTime(),
          new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
        )
      );

      if (segEnd >= segStart) {
        const daysInMonth = monthEnd.getDate();
        const overlapDays = daysBetweenInclusive(segStart, segEnd);
        const fraction = Math.min(1, Math.max(0, overlapDays / daysInMonth));
        totalIncome += m * fraction;
      }

      // next month
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return totalIncome;
  }

  // Effective income for the chosen range (e.g., Jan 1 → Feb 12 with 80k/month ≈ 80k * (31/31 + 12/28) = 80k * 1.4286 ≈ 1,14,286 for 2026 Feb(28))
  const effectiveIncome = useMemo(() => {
    if (!rangeStart || !rangeEnd) return Number(monthlySalary) || 0;
    return getProratedIncomeForRange(
      Number(monthlySalary) || 0,
      rangeStart,
      rangeEnd
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlySalary, rangeStart, rangeEnd]);

  // Derived metrics
  const k = useMemo(() => {
    const rent = categoryTotals["Rent/Bills"] || 0;
    const emis = categoryTotals["EMIs"] || 0;
    const cc = categoryTotals["Credit Card"] || 0;
    const grocery = categoryTotals["Grocery"] || 0;
    const shopping = categoryTotals["Shopping"] || 0;
    const other = categoryTotals["Other"] || 0;
    const mutual = categoryTotals["Mutual Fund"] || 0;
    const stocks = categoryTotals["Stocks"] || 0;
    const investing = mutual + stocks;

    const spent = Number(total) || 0;
    const income = Number(effectiveIncome) || 0;
    const savings = Math.max(0, income - spent);
    const savingsRate = income > 0 ? savings / income : 0;

    const needsActual = rent + grocery + emis + cc + Math.max(0, other * 0.5);
    const wantsActual = shopping + Math.max(0, other * 0.5);

    return {
      rent,
      emis,
      cc,
      grocery,
      shopping,
      other,
      mutual,
      stocks,
      investing,
      spent,
      savings,
      savingsRate,
      needsActual,
      wantsActual,
      income,
    };
  }, [categoryTotals, total, effectiveIncome]);

  const plan = useMemo(() => {
    const income = k.income || 0;
    const needsCap = income * 0.5;
    const wantsCap = income * 0.3;
    const investMin = income * 0.2;

    const overspend = Math.max(0, k.spent - income);
    const debtPay = k.emis + k.cc;

    const suggestions = [];
    if (income <= 0) {
      suggestions.push(
        "Provide a valid monthly salary to enable range-based analysis."
      );
    } else {
      if (overspend > 0) {
        suggestions.push(
          `Overspending by ${fmt(
            overspend
          )} in this range. Reduce wants by 10–20% and prioritize debt paydown.`
        );
      } else {
        suggestions.push(
          `Savings in this range: ${fmt(k.savings)} (${Math.round(
            k.savingsRate * 100
          )}%). Keep ≥ 20% consistently.`
        );
      }
      if (k.investing < investMin) {
        suggestions.push(
          `Investments below 20% target for the range. Add ~${fmt(
            investMin - k.investing
          )} to SIPs to hit the floor.`
        );
      }
      if (k.wantsActual > wantsCap) {
        suggestions.push(
          `Wants at ${fmt(k.wantsActual)} exceed the 30% cap (${fmt(
            wantsCap
          )}) for this range.`
        );
      }
      if (k.needsActual > needsCap) {
        suggestions.push(
          `Essentials at ${fmt(k.needsActual)} exceed the 50% guideline (${fmt(
            needsCap
          )}) for this range.`
        );
      }
      const ef3 = k.spent * 3;
      const ef6 = k.spent * 6;
      const efMonthly = Math.ceil(Math.max(0, ef3) / 12);
      suggestions.push(
        `Build emergency fund of ${fmt(ef3)}–${fmt(
          ef6
        )} (3–6× expenses). Save ~${fmt(efMonthly)}/mo.`
      );
    }

    return {
      needsCap,
      wantsCap,
      investMin,
      overspend,
      debtPay,
      suggestions: suggestions.slice(0, 6),
    };
  }, [
    fmt,
    k.emis,
    k.cc,
    k.savings,
    k.savingsRate,
    k.spent,
    k.investing,
    k.needsActual,
    k.wantsActual,
    k.income,
  ]);

  // progress & deltas relative to *range* income
  const needsPctOfIncome = pct(k.needsActual, k.income);
  const wantsPctOfIncome = pct(k.wantsActual, k.income);
  const investPctOfIncome = pct(k.investing, k.income);

  const needsDelta = k.needsActual - plan.needsCap; // negative is good
  const wantsDelta = k.wantsActual - plan.wantsCap; // negative is good
  const investDelta = plan.investMin - k.investing; // positive means add more

  const srClass =
    k.savingsRate >= 0.2
      ? "text-good"
      : k.savingsRate >= 0.1
      ? "text-warn"
      : "text-bad";

  // --- Highlight numbers in suggestions (unchanged) ---
  function renderWithHighlight(text) {
    const s = String(text);
    const re = new RegExp(
      `(₹\\s?\\d[\\d,\\.]*|\\d+[\\d,]*%|\\d+×|\\d+–\\d+×|/mo\\.)`,
      "g"
    );
    const nodes = [];
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) nodes.push(s.slice(last, m.index));
      nodes.push(
        <strong key={m.index} className="num-emphasis">
          {m[0]}
        </strong>
      );
      last = m.index + m[0].length;
    }
    if (last < s.length) nodes.push(s.slice(last));
    return nodes;
  }

  return (
    <aside className="advisor-panel">
      <div className="advisor-card">
        <header className="advisor-header">
          <div className="advisor-title-wrap">
            <div className="advisor-title-row">
              <h4 className="advisor-title">{title}</h4>
              <div className="badge salary-badge">
                {showSalary && (
                  <>
                    <span className="salary-label">Salary:</span>
                    <strong className="salary-value">
                      {showSalary ? fmt(monthlySalary) : "*****"}
                    </strong>
                  </>
                )}
                <button
                  className="icon-btn"
                  aria-label={showSalary ? "Hide salary" : "Show salary"}
                  title={showSalary ? "Hide salary" : "Show salary"}
                  onClick={() => setShowSalary((s) => !s)}
                >
                  {showSalary ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <p className="advisor-subtitle muted">
              Based on your monthly salary and current spending
            </p>
          </div>
        </header>

        {/* KPIs */}
        <section className="kpis">
          <div className="kpi">
            <span className="kpi-label">Total Spent</span>
            <span className="kpi-value number-strong">{fmt(k.spent)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Savings</span>
            <span className="kpi-value number-strong text-good">
              {fmt(k.savings)}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Savings Rate</span>
            <span className={`kpi-value number-strong ${srClass}`}>
              {k.income ? `${Math.round(k.savingsRate * 100)}%` : "—"}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Investment</span>
            <span className="kpi-value number-strong text-accent">
              {fmt(k.investing)}
            </span>
          </div>
        </section>

        {/* Progress bars */}
        <section className="progress-block">
          {/* --- Compact Mini Allocation (Option C) --- */}
          <section className="alloc-mini">
            <div className="alloc-header">
              <h5 className="section-title">Allocation Overview</h5>
              <span className="alloc-help muted">
                <abbr title="Needs: Essentials (Rent/Bills, Grocery, EMIs, Credit Card); Wants: Non-essentials (Shopping); Invest: Mutual Fund + Stocks">
                  (needs, wants, invest)
                </abbr>
              </span>
            </div>

            <MiniAllocationRow
              label="Needs"
              help="Essentials: Rent/Bills, Grocery, EMIs, Credit Card, ~½ Other"
              percent={needsPctOfIncome}
              actual={k.needsActual}
              target={plan.needsCap}
              currencySymbol={currencySymbol}
              variant="needs"
              delta={needsDelta} // negative is good
              invertDelta={false}
            />

            <MiniAllocationRow
              label="Wants"
              help="Non-essentials: Shopping, ~½ Other"
              percent={wantsPctOfIncome}
              actual={k.wantsActual}
              target={plan.wantsCap}
              currencySymbol={currencySymbol}
              variant="wants"
              delta={wantsDelta} // negative is good
              invertDelta={false}
            />

            <MiniAllocationRow
              label="Invest"
              help="Investing: Mutual Fund + Stocks"
              percent={investPctOfIncome}
              actual={k.investing}
              target={plan.investMin}
              currencySymbol={currencySymbol}
              variant="invest"
              delta={investDelta} // <= 0 is good (met or exceeded)
              invertDelta={true}
            />
          </section>
        </section>

        {/* Suggestions */}
        <section className="suggestions">
          <h5 className="section-title">Top Suggestions</h5>
          <ul className="suggestion-list">
            {plan.suggestions.map((s, i) => (
              <li key={i} className="suggestion-item">
                <span className="suggestion-text">
                  {renderWithHighlight(s)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="fine-print muted">
          This assistant uses budgeting heuristics (50/30/20, debt avalanche)
          and your category totals. Income and targets are prorated to your
          selected date range.
        </footer>
      </div>
    </aside>
  );
}

function MiniAllocationRow({
  label,
  help,
  percent = 0, // percent of range income (0..100)
  actual = 0,
  target = 0,
  currencySymbol = "₹",
  variant = "needs", // 'needs' | 'wants' | 'invest'
  delta = 0,
  invertDelta = false, // for Invest, <= 0 is good
}) {
  const pctClamped = Math.min(100, Math.max(0, Math.round(percent || 0)));
  const isGood = invertDelta ? delta <= 0 : delta <= 0;
  const deltaSign = delta === 0 ? "" : delta > 0 ? "+" : "−";
  const deltaAbs = Math.abs(delta);

  const fmtLocal = (n) => formatINR(Math.round(n || 0), currencySymbol);

  return (
    <div
      className="alloc-mini-row"
      role="group"
      aria-label={`${label} allocation`}
    >
      {/* Left: label + % */}
      <div className="am-left">
        <span className="am-label" title={help}>
          {label}
        </span>
        <span className="am-pct">{pctClamped}%</span>
      </div>

      {/* Middle: tiny bar */}
      <div className="am-bartrack" aria-hidden="true">
        <span
          className={`am-bar ${variant}`}
          style={{ width: `${pctClamped}%` }}
        />
      </div>

      {/* Right: delta chip */}
      <div className="am-right">
        {Math.abs(delta) >= 1 ? (
          <span className={`am-delta ${isGood ? "good" : "bad"}`}>
            {deltaSign}
            {fmtLocal(deltaAbs)}
          </span>
        ) : (
          <span className="am-delta neutral">On Target</span>
        )}
      </div>

      {/* Second line: Actual / Target */}
      <div className="am-meta">
        <span className="am-actual">
          Actual: <strong>{fmtLocal(actual)}</strong>
        </span>
        <span className="am-target muted">Target: {fmtLocal(target)}</span>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */
function EyeIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a3 3 0 1 0 4.2 4.2" />
      <path d="M9.5 5.1A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-5.1 5.1" />
      <path d="M6.1 6.1A18.5 18.5 0 0 0 1 12s4 7 11 7c1.1 0 2.2-.2 3.2-.5" />
    </svg>
  );
}

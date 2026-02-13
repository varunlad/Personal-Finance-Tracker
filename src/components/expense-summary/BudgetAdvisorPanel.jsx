import { useMemo, useState, useEffect, useCallback } from "react";
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
  const fmt = useCallback(
    (n, sym = currencySymbol) => formatINR(Math.round(n || 0), sym),
    [currencySymbol]
  );

  /* ----------------- BUDGET RULES ----------------- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const RULES = [
    {
      key: "50-30-20",
      label: "50 / 30 / 20",
      p: { needs: 0.5, wants: 0.3, invest: 0.2 },
      desc: "Classic balanced plan: up to 50% essentials, 30% wants, ≥20% invest.",
    },
    {
      key: "30-40-30",
      label: "30 / 40 / 30",
      p: { needs: 0.3, wants: 0.4, invest: 0.3 },
      desc: "Aggressive growth with lifestyle: 30% needs, 40% wants, 30% invest.",
    },
    {
      key: "40-30-30",
      label: "40 / 30 / 30",
      p: { needs: 0.4, wants: 0.3, invest: 0.3 },
      desc: "Lean essentials (40%), balanced wants (30%), higher investing (30%).",
    },
    {
      key: "60-20-20",
      label: "60 / 20 / 20",
      p: { needs: 0.6, wants: 0.2, invest: 0.2 },
      desc: "High fixed costs: 60% needs, 20% wants, 20% invest.",
    },
    {
      key: "custom",
      label: "Custom",
      p: null,
      desc: "Enter your own split (must total 100%).",
    },
  ];
  const DEFAULT_RULE_KEY = "50-30-20";

  /* ----------------- TOOLTIP TEXTS ----------------- */
  const HELP = {
    salary:
      "Monthly salary used to compute targets. It is prorated over the selected date range (partial months are counted by day).",
    needs:
      "Essentials: Rent & Bills, Groceries, EMIs, Credit Card minimums and ~½ of 'Other'.",
    wants: "Non-essentials: Shopping & discretionary items, and ~½ of 'Other'.",
    invest: "Investments in this range: Mutual Funds + Stocks.",
  };

  /* ----------------- LOCAL STATE ----------------- */
  const [salaryInput, setSalaryInput] = useState(
    Number(monthlySalary) ? String(Number(monthlySalary)) : ""
  );
  const [appliedSalary, setAppliedSalary] = useState(
    Number(monthlySalary) || 0
  );

  const [selectedRuleKey, setSelectedRuleKey] = useState(DEFAULT_RULE_KEY);
  const [customNeeds, setCustomNeeds] = useState("50");
  const [customWants, setCustomWants] = useState("30");
  const [customInvest, setCustomInvest] = useState("20");
  const [appliedRule, setAppliedRule] = useState(RULES[0]); // default 50/30/20

  const [showSalary, setShowSalary] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Load persisted settings (optional)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("advisor_prefs") || "{}");
      if (typeof saved.salary === "number") {
        setSalaryInput(String(saved.salary));
        setAppliedSalary(Number(saved.salary));
      }
      if (saved.ruleKey) {
        const found = RULES.find((r) => r.key === saved.ruleKey);
        if (found) {
          setSelectedRuleKey(found.key);
          if (found.key === "custom" && saved.custom) {
            setCustomNeeds(String(saved.custom.needs ?? 0));
            setCustomWants(String(saved.custom.wants ?? 0));
            setCustomInvest(String(saved.custom.invest ?? 0));
            setAppliedRule({
              key: "custom",
              label: "Custom",
              p: {
                needs: (saved.custom.needs || 0) / 100,
                wants: (saved.custom.wants || 0) / 100,
                invest: (saved.custom.invest || 0) / 100,
              },
              desc: "Custom split.",
            });
          } else if (found.p) {
            setAppliedRule(found);
          }
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror parent salary if user hasn't saved preferences
  useEffect(() => {
    if (!localStorage.getItem("advisor_prefs")) {
      setSalaryInput(String(Number(monthlySalary) || 0));
      setAppliedSalary(Number(monthlySalary) || 0);
    }
  }, [monthlySalary]);

  /* ----------------- DATE HELPERS / PRORATION ----------------- */
  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  function daysBetweenInclusive(a, b) {
    const d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((d1 - d0) / (24 * 3600 * 1000)) + 1;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function getProratedIncomeForRange(monthly, start, end) {
    const m = Number(monthly) || 0;
    if (m <= 0 || !(start instanceof Date) || !(end instanceof Date) || end < start) return 0;
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    let totalIncome = 0;
    while (cursor <= lastMonth) {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      const segStart = new Date(
        Math.max(monthStart.getTime(), new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime())
      );
      const segEnd = new Date(
        Math.min(monthEnd.getTime(), new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime())
      );
      if (segEnd >= segStart) {
        const daysInMonth = monthEnd.getDate();
        const overlapDays = daysBetweenInclusive(segStart, segEnd);
        const fraction = Math.min(1, Math.max(0, overlapDays / daysInMonth));
        totalIncome += m * fraction;
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return totalIncome;
  }

  // Use applied salary or fallback to prop if invalid
  const effectiveMonthly = useMemo(() => {
    const s = Number(appliedSalary) || Number(monthlySalary) || 0;
    return Math.max(0, s);
  }, [appliedSalary, monthlySalary]);

  // Active rule
  const activeRule = useMemo(() => {
    if (appliedRule?.key === "custom" && appliedRule?.p) return appliedRule;
    if (appliedRule?.p) return appliedRule;
    return RULES[0];
  }, [RULES, appliedRule]);

  // Prorated income for date range
  const effectiveIncome = useMemo(() => {
    if (!rangeStart || !rangeEnd) return effectiveMonthly;
    return getProratedIncomeForRange(effectiveMonthly, rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, effectiveMonthly, getProratedIncomeForRange]);

  /* ----------------- DERIVED METRICS ----------------- */
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
      rent, emis, cc, grocery, shopping, other,
      mutual, stocks, investing, spent, savings, savingsRate,
      needsActual, wantsActual, income
    };
  }, [categoryTotals, total, effectiveIncome]);

  // Targets from ACTIVE RULE
  const plan = useMemo(() => {
    const income = k.income || 0;
    const needsCap = income * (activeRule?.p?.needs ?? 0.5);
    const wantsCap = income * (activeRule?.p?.wants ?? 0.3);
    const investMin = income * (activeRule?.p?.invest ?? 0.2);

    // Suggestions (we'll override wording below with simple language)
    const suggestions = [];

    const overspend = Math.max(0, k.spent - income);
    if (income <= 0) {
      suggestions.push("Please enter a valid monthly salary to analyze this date range.");
    } else {
      if (overspend > 0) suggestions.push(`You spent a bit more than your income by ${fmt(overspend)}. Try lowering optional items a little.`);
      const ef3 = k.spent * 3;
      const ef6 = k.spent * 6;
      const efMonthly = Math.ceil(Math.max(0, ef3) / 12);
      suggestions.push(`Aim for an emergency fund of ${fmt(ef3)}–${fmt(ef6)}. Saving about ${fmt(efMonthly)}/month will get you there.`);
    }

    return { needsCap, wantsCap, investMin, suggestions: suggestions.slice(0, 6) };
  }, [k, activeRule, fmt]);

  const srClass = k.savingsRate >= 0.2 ? "text-good" : k.savingsRate >= 0.1 ? "text-warn" : "text-bad";

  /* ----------------- APPLY / VALIDATION ----------------- */
  const isCustomActive = selectedRuleKey === "custom";
  const customSum = Number(customNeeds || 0) + Number(customWants || 0) + Number(customInvest || 0);
  const customError = isCustomActive && customSum !== 100;

  function handleApplyControls() {
    let ruleToApply = RULES.find((r) => r.key === selectedRuleKey) || RULES[0];
    if (selectedRuleKey === "custom") {
      if (customError) return;
      ruleToApply = {
        key: "custom",
        label: "Custom",
        p: {
          needs: (Number(customNeeds) || 0) / 100,
          wants: (Number(customWants) || 0) / 100,
          invest: (Number(customInvest) || 0) / 100,
        },
        desc: "Custom split.",
      };
    }

    const salaryNum = Math.max(0, Number(salaryInput) || 0);

    setIsApplying(true);
    setAppliedRule(ruleToApply);
    setAppliedSalary(salaryNum);

    try {
      localStorage.setItem("advisor_prefs", JSON.stringify({
        salary: salaryNum,
        ruleKey: ruleToApply.key,
        custom: ruleToApply.key === "custom" ? {
          needs: Number(customNeeds) || 0,
          wants: Number(customWants) || 0,
          invest: Number(customInvest) || 0,
        } : undefined,
      }));
    } catch { /* ignore */ }

    setTimeout(() => setIsApplying(false), 650);
  }

  function handleResetControls() {
    setSelectedRuleKey(DEFAULT_RULE_KEY);
    setCustomNeeds("50");
    setCustomWants("30");
    setCustomInvest("20");
    setAppliedRule(RULES[0]);
    setSalaryInput(String(Number(monthlySalary) || 0));
    setAppliedSalary(Number(monthlySalary) || 0);
    try { localStorage.removeItem("advisor_prefs"); } catch { /* ignore */ }
  }

  function renderWithHighlight(text) {
    const s = String(text);
    const re = new RegExp(`(₹\\s?\\d[\\d,\\.]*|\\d+[\\d,]*%|\\d+×|\\d+–\\d+×|/mo\\.)`, "g");
    const nodes = [];
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) nodes.push(s.slice(last, m.index));
      nodes.push(<strong key={m.index} className="num-emphasis">{m[0]}</strong>);
      last = m.index + m[0].length;
    }
    if (last < s.length) nodes.push(s.slice(last));
    return nodes;
  }

  // ---- Helper: friendly rounding (to nearest 500 by default) ----
  const roundTo = (amount, step = 500) =>
    Math.round((Number(amount) || 0) / step) * step;

  // Deltas for plain language
  const wantsDelta = k.wantsActual - (plan?.wantsCap ?? 0);  // negative = good
  const investShort = (plan?.investMin ?? 0) - k.investing;  // positive = need to add

  // Build "Option A" simple suggestions with numbers (friendly-rounded)
  const simpleSuggestions = useMemo(() => {
    const out = [];

    if (k.savings > 0) {
      const pct = k.income ? Math.round((k.savings / k.income) * 100) : 0;
      out.push(`Great — you saved ${fmt(k.savings)} this period (about ${pct}%). Keep going!`);
    }

    if (investShort > 300) {
      const friendlyAdd = roundTo(investShort, 500); // e.g., ₹10,500 → shown as ₹10,500
      // Also give a "small step" action like ₹2,000 more
      const smallStep = roundTo(Math.max(2000, investShort * 0.2), 500);
      out.push(`To reach a healthy investment level, add about ${fmt(friendlyAdd)} this time. If that’s tough, start with ${fmt(smallStep)} more and build up.`);
    } else {
      out.push(`Nice — your investing looks okay for this period. Maintain it or add a little more if you can.`);
    }

    if (wantsDelta > 1000) {
      const trim = roundTo(wantsDelta, 500);
      out.push(`Optional spending is a bit high. Try cutting about ${fmt(trim)} from non‑essentials next time.`);
    } else {
      out.push(`Your optional spending looks comfortable. Good control!`);
    }

    // Keep EF always last
    const ef3 = k.spent * 3;
    const ef6 = k.spent * 6;
    const efMonthly = Math.ceil(Math.max(0, ef3) / 12);
    out.push(`Build an emergency buffer of ${fmt(ef3)}–${fmt(ef6)} (3–6× monthly expenses). Saving about ${fmt(efMonthly)}/month gets you there steadily.`);

    return out.slice(0, 4);
  }, [k.savings, k.income, k.spent, wantsDelta, investShort, fmt]);

  const selectedRule = RULES.find((r) => r.key === selectedRuleKey) || RULES[0];

  return (
    <aside className="advisor-panel">
      <div className={`advisor-card ${isApplying ? "loading" : ""}`}>
        {/* ---------- Header with editable salary ---------- */}
        <header className="advisor-header">
          <div className="advisor-title-wrap">
            <div className="advisor-title-row">
              <h4 className="advisor-title">{title}</h4>

              {/* Salary editor in header (with hide/show) */}
              <div className="salary-editor" title={HELP.salary} aria-label={HELP.salary}>
                <span className="prefix">{currencySymbol}</span>
                <input
                  className={`salary-input ${!showSalary ? "obscured" : ""}`}
                  type={showSalary ? "number" : "password"}
                  inputMode="numeric"
                  min={showSalary ? "0" : undefined}
                  step={showSalary ? "100" : undefined}
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  placeholder="0"
                />
                <button
                  className="icon-btn"
                  aria-label={showSalary ? "Hide salary" : "Show salary"}
                  title={showSalary ? "Hide salary" : "Show salary"}
                  onClick={() => setShowSalary((s) => !s)}
                >
                  {showSalary ? <EyeOffIcon/> : <EyeIcon/>}
                </button>
              </div>
            </div>

            {/* Rule + Apply/Reset */}
            <div className="header-meta">
              <div className="header-controls">
                <div className="rule-dropdown" title={selectedRule.desc}>
                  <label htmlFor="ruleSelect" className="ctrl-label">Budget rule</label>
                  <select
                    id="ruleSelect"
                    className="select"
                    value={selectedRuleKey}
                    onChange={(e) => setSelectedRuleKey(e.target.value)}
                  >
                    {RULES.map(r => (
                      <option key={r.key} value={r.key} title={r.desc}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {selectedRuleKey === "custom" && (
                    <div className="custom-inline" title="Enter a split that totals 100%">
                      <div className="pct">
                        <label title="Essentials (Needs)">Needs</label>
                        <input type="number" min="0" max="100" step="1"
                          value={customNeeds} onChange={(e)=>setCustomNeeds(e.target.value)} />
                        <span>%</span>
                      </div>
                      <div className="pct">
                        <label title="Wants (non‑essentials)">Wants</label>
                        <input type="number" min="0" max="100" step="1"
                          value={customWants} onChange={(e)=>setCustomWants(e.target.value)} />
                        <span>%</span>
                      </div>
                      <div className="pct">
                        <label title="Invest (MF + Stocks)">Invest</label>
                        <input type="number" min="0" max="100" step="1"
                          value={customInvest} onChange={(e)=>setCustomInvest(e.target.value)} />
                        <span>%</span>
                      </div>
                      <div className={`sum ${customError ? "bad" : ""}`}>Sum: {customSum}%</div>
                    </div>
                  )}
                </div>

                <div className="header-actions">
                  <button
                    className="btn primary"
                    onClick={handleApplyControls}
                    disabled={customError || isApplying}
                    title={customError ? "Custom split must sum to 100%" : "Apply salary & rule"}
                  >
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                  <button className="btn" onClick={handleResetControls} disabled={isApplying}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ---------- KPIs ---------- */}
        <section className="kpis">
          <div className="kpi" title="Total outflow in this date range">
            <span className="kpi-label">Total Spent</span>
            <span className={`kpi-value number-strong ${isApplying ? "skeleton" : ""}`}>
              {fmt(k.spent)}
            </span>
          </div>
          <div className="kpi" title="Income (range-adjusted) minus Spent">
            <span className="kpi-label">Savings</span>
            <span className={`kpi-value number-strong text-good ${isApplying ? "skeleton" : ""}`}>
              {fmt(k.savings)}
            </span>
          </div>
          <div className="kpi" title="Savings ÷ Range Income">
            <span className="kpi-label">Savings Rate</span>
            <span className={`kpi-value number-strong ${srClass} ${isApplying ? "skeleton" : ""}`}>
              {k.income ? `${Math.round(k.savingsRate * 100)}%` : "—"}
            </span>
          </div>
          <div className="kpi" title={HELP.invest}>
            <span className="kpi-label">Investing</span>
            <span className={`kpi-value number-strong text-accent ${isApplying ? "skeleton" : ""}`}>
              {fmt(k.investing)}
            </span>
          </div>
        </section>

        {/* ---------- Spending Analysis (Option A: friendly) ---------- */}
        <section className="simple-analysis">
          <h5 className="section-title">Spending Analysis</h5>

          <PlainAnalysisItem
            loading={isApplying}
            title={<LabelWithTip label="Essentials (Needs)" tip={HELP.needs} />}
            amount={k.needsActual}
            delta={k.needsActual - plan.needsCap} // negative means “less than typical”
            currencySymbol={currencySymbol}
            // Text: “You spent X. This is less/more than typical. Guidance line.”
          />

          <PlainAnalysisItem
            loading={isApplying}
            title={<LabelWithTip label="Wants (Optional stuff)" tip={HELP.wants} />}
            amount={k.wantsActual}
            delta={k.wantsActual - plan.wantsCap}
            currencySymbol={currencySymbol}
          />

          <PlainAnalysisItem
            loading={isApplying}
            title={<LabelWithTip label="Investing (MF + Stocks)" tip={HELP.invest} />}
            amount={k.investing}
            // For investing we invert: if short of target → deltaShort > 0
            deltaShort={(plan.investMin - k.investing)}
            investMode
            currencySymbol={currencySymbol}
            smallStep={roundTo(Math.max(2000, (plan.investMin - k.investing) * 0.2), 500)}
          />
        </section>

        {/* ---------- Top Suggestions (simple bullets) ---------- */}
        <section className="suggestions">
          <h5 className="section-title">Top Suggestions</h5>
          <ul className="suggestion-list">
            {(isApplying
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="suggestion-item">
                    <span className="suggestion-text skeleton" style={{ display: "inline-block", width: "90%" }} />
                  </li>
                ))
              : simpleSuggestions.map((s, i) => (
                  <li key={i} className="suggestion-item">
                    <span className="suggestion-text">{renderWithHighlight(s)}</span>
                  </li>
                )))}
          </ul>
        </section>

        <footer className="fine-print muted">
          Targets & insights use your selected budget rule and range‑adjusted income.
          You can change both anytime above.
        </footer>
      </div>
    </aside>
  );
}

/* ---------- Simple, friendly analysis rows ---------- */
function PlainAnalysisItem({
  title,
  amount,
  delta,       // for Needs/Wants (negative = spent less than typical)
  deltaShort,  // for Investing shortfall (positive = add more)
  currencySymbol,
  loading,
  investMode = false,
  smallStep = 2000,
}) {
  const fmtLocal = (n) => formatINR(Math.round(n || 0), currencySymbol);

  if (loading) {
    return (
      <div className="analysis-item loading">
        <h4 className="analysis-title">{title}</h4>
        <p className="analysis-line skeleton"></p>
        <p className="analysis-line skeleton"></p>
      </div>
    );
  }

  if (!investMode) {
    // Needs / Wants
    const isUnder = Number(delta) <= 0;
    const abs = Math.abs(Number(delta) || 0);
    return (
      <div className="analysis-item">
        <h4 className="analysis-title">{title}</h4>
        <p className="analysis-line">
          You spent <strong>{fmtLocal(amount)}</strong>. This is{" "}
          <strong>{isUnder ? "less" : "more"}</strong> than what people usually spend
          for this time period by <strong>{fmtLocal(abs)}</strong>.
        </p>
        <p className={isUnder ? "analysis-good" : "analysis-bad"}>
          {isUnder ? "👍 Nice job — you’re spending wisely here." : "⚠️ Try to keep this a bit lower next time."}
        </p>
      </div>
    );
  }

  // Investing
  const short = Math.max(0, Number(deltaShort) || 0);
  return (
    <div className="analysis-item">
      <h4 className="analysis-title">{title}</h4>
      {short > 0 ? (
        <>
          <p className="analysis-line">
            You invested <strong>{fmtLocal(amount)}</strong>. To be in a healthy zone,
            try adding about <strong>{fmtLocal(short)}</strong> this time.
          </p>
          <p className="analysis-bad">📌 If that feels big, start with just <strong>{fmtLocal(smallStep)}</strong> more and build up.</p>
        </>
      ) : (
        <>
          <p className="analysis-line">
            You invested <strong>{fmtLocal(amount)}</strong>. That’s good for this period.
          </p>
          <p className="analysis-good">👍 Keep this going — even small regular amounts help a lot.</p>
        </>
      )}
    </div>
  );
}

function LabelWithTip({ label, tip }) {
  return (
    <span className="label-tip">
      {label}
      <span className="info" title={tip} aria-label={tip}><InfoIcon /></span>
    </span>
  );
}

/* ---------- Icons ---------- */
function EyeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a3 3 0 1 0 4.2 4.2" />
      <path d="M9.5 5.1A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-5.1 5.1" />
      <path d="M6.1 6.1A18.5 18.5 0 0 0 1 12s4 7 11 7c1.1 0 2.2-.2 3.2-.5" />
    </svg>
  );
}
function InfoIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}
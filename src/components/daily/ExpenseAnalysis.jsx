import { useMemo, useState } from "react";
import "./ExpenseAnalysis.css";

/**
 * Props:
 *  - expenses: Array<{ date: 'YYYY-MM-DD', amount: number, category?: string }>
 *  - currency?: 'INR' | 'RS'
 *  - initialYear?: number
 *  - initialMonth?: number
 *  - onUpdateExpenses?: (next: Array<{ date: string; amount: number; category?: string }>) => void
 */
export default function ExpenseAnalysis({
  expenses = [],
  currency = "RS",
  initialYear,
  initialMonth,
  onUpdateExpenses, // parent receives updated array
}) {
  // ---- Helpers ----
  const pad2 = (n) => String(n).padStart(2, "0");

  // Always show ₹ for INR/RS; fallback to Intl for other currencies
  const fmtAmount = (n) =>
    currency === "INR" || currency === "RS"
      ? "₹ " + new Intl.NumberFormat("en-IN").format(n)
      : new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
          n
        );

  const parseYMD = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return { y, m, d };
  };
  const toYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

  // Category normalization (support various inputs)
  const normalizeCat = (c) => {
    const s = String(c || "other").toLowerCase();
    if (s.includes("mutual")) return "mutualFund";
    if (s.includes("stock")) return "stock";
    if (s.includes("shop")) return "shopping";
    if (s.includes("groc")) return "grocery";
    if (s.includes("rent") || s.includes("bill")) return "rentBills";
    return "other";
  };

  // NEW: definitions for tooltip info
  const CATEGORY_INFO = {
    mutualFund: "Investments into mutual fund schemes (SIP/lump sum).",
    stock: "Direct equity shares or ETFs purchased.",
    shopping: "General retail purchases (clothes, electronics, etc.).",
    grocery: "Daily essentials and food items (vegetables, staples, etc.).",
    rentBills:
      "Recurring rent and household bills (electricity, gas, water, internet).",
    other: "Miscellaneous expenses not categorized above.",
  };

  const CATEGORY_OPTIONS = [
    { value: "mutualFund", label: "Mutual Fund" },
    { value: "stock", label: "Stock Invested" },
    { value: "shopping", label: "Shopping" },
    { value: "grocery", label: "Grocery" },
    { value: "rentBills", label: "Rent/Bills" }, // NEW
    { value: "other", label: "Other" },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emptyCats = {
    mutualFund: 0,
    stock: 0,
    shopping: 0,
    grocery: 0,
    rentBills: 0,
    other: 0,
  };

  // ---- Initial selection (defaults from props or latest data or today) ----
  const allYM = useMemo(() => {
    const set = new Set(
      expenses.map((e) => {
        const { y, m } = parseYMD(e.date);
        return `${y}-${pad2(m)}`;
      })
    );
    return Array.from(set).sort();
  }, [expenses]);

  let defaultYear = new Date().getFullYear();
  let defaultMonth = new Date().getMonth() + 1;
  if (allYM.length) {
    const [yStr, mStr] = allYM[allYM.length - 1].split("-");
    defaultYear = Number(yStr);
    defaultMonth = Number(mStr);
  }

  const [year, setYear] = useState(initialYear ?? defaultYear);
  const [month, setMonth] = useState(initialMonth ?? defaultMonth);

  // ---- Filter strictly to selected month ----
  const monthExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const { y, m } = parseYMD(e.date);
        return y === year && m === month;
      }),
    [expenses, year, month]
  );

  // ---- Aggregations for selected month ----
  const monthTotal = useMemo(() => {
    let t = 0;
    for (const e of monthExpenses) t += Number(e.amount) || 0;
    return t;
  }, [monthExpenses]);

  const monthByCategory = useMemo(() => {
    const cat = { ...emptyCats };
    for (const e of monthExpenses) {
      cat[normalizeCat(e.category)] += Number(e.amount) || 0;
    }
    return cat;
  }, [emptyCats, monthExpenses]);

  // d -> { total, categories }
  const totalsByDayInMonth = useMemo(() => {
    const map = new Map();
    for (const e of monthExpenses) {
      const { d } = parseYMD(e.date);
      const c = normalizeCat(e.category);
      const amt = Number(e.amount) || 0;
      if (!map.has(d)) map.set(d, { total: 0, categories: { ...emptyCats } });
      const rec = map.get(d);
      rec.total += amt;
      rec.categories[c] += amt;
    }
    return map;
  }, [emptyCats, monthExpenses]);

  // ---- Editor state (per day) ----
  const [editingDay, setEditingDay] = useState(null); // number | null
  const [editRows, setEditRows] = useState([]); // [{ id, amount, category, originalIndex, isNew }]
  const [pendingDeleteIds, setPendingDeleteIds] = useState(new Set());

  function openEditor(dayNum) {
    const dateStr = toYMD(year, month, dayNum);
    const indexesForDay = [];
    for (let i = 0; i < expenses.length; i++) {
      if (expenses[i].date === dateStr) indexesForDay.push(i);
    }

    const rows = [];
    let idxPos = 0;
    for (const e of monthExpenses) {
      const { d } = parseYMD(e.date);
      if (d === dayNum) {
        const originalIndex = indexesForDay[idxPos] ?? -1;
        idxPos++;
        rows.push({
          id: cryptoRandomId(),
          amount: Number(e.amount) || 0,
          category: normalizeCat(e.category),
          originalIndex,
          isNew: false,
        });
      }
    }

    setEditingDay(dayNum);
    setEditRows(rows);
    setPendingDeleteIds(new Set());
  }

  function closeEditor() {
    setEditingDay(null);
    setEditRows([]);
    setPendingDeleteIds(new Set());
  }

  function addRow() {
    setEditRows((rows) => [
      ...rows,
      {
        id: cryptoRandomId(),
        amount: 0,
        category: "other",
        originalIndex: -1,
        isNew: true,
      },
    ]);
  }

  function updateRow(id, patch) {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function toggleDelete(id) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveChanges() {
    if (!onUpdateExpenses) {
      console.warn(
        "onUpdateExpenses is not provided. Changes will not persist."
      );
      closeEditor();
      return;
    }
    const dateStr = toYMD(year, month, editingDay);

    const next = expenses.slice();

    // Apply edits & deletes
    for (const r of editRows) {
      const isDelete = pendingDeleteIds.has(r.id);

      if (r.originalIndex >= 0) {
        // Existing item
        if (isDelete) {
          next.splice(r.originalIndex, 1);
        } else {
          next[r.originalIndex] = {
            ...next[r.originalIndex],
            date: dateStr,
            amount: Number(r.amount) || 0,
            category: r.category,
          };
        }
      } else {
        // New item
        if (!isDelete) {
          next.push({
            date: dateStr,
            amount: Number(r.amount) || 0,
            category: r.category,
          });
        }
      }
    }

    onUpdateExpenses(next);
    closeEditor();
  }

  // ---- UI ----
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const monthDays = daysInMonth(year, month);
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

  // Precompute category percentages
  const catPct = {
    mutualFund: pct(monthByCategory.mutualFund, monthTotal),
    stock: pct(monthByCategory.stock, monthTotal),
    shopping: pct(monthByCategory.shopping, monthTotal),
    grocery: pct(monthByCategory.grocery, monthTotal),
    rentBills: pct(monthByCategory.rentBills, monthTotal), // NEW
    other: pct(monthByCategory.other, monthTotal),
  };

  return (
    <section className="card">
      {/* Controls: Month-only */}
      <div className="ea-header">
        <div className="ea-title">Expense Analysis</div>

        <div className="ea-controls">
          <label className="ea-control">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from(new Set(expenses.map((e) => parseYMD(e.date).y)))
                .sort((a, b) => a - b)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              {expenses.length === 0 && <option value={year}>{year}</option>}
            </select>
          </label>

          <label className="ea-control">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Intl.DateTimeFormat("en", { month: "short" }).format(
                    new Date(year, m - 1, 1)
                  )}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="ea-subtitle">
        {monthName} {year}
      </div>

      <div className="ea-cards">
        <div className="ea-card">
          <div className="muted">Total Expense</div>
          <div className="ea-amount-lg">{fmtAmount(monthTotal)}</div>
        </div>

        {/* Category cards with percentage + info tooltip */}
        <CategoryCard
          title="Mutual Fund"
          percent={catPct.mutualFund}
          amount={fmtAmount(monthByCategory.mutualFund)}
          barClass="mf"
          info={CATEGORY_INFO.mutualFund}
        />
        <CategoryCard
          title="Stock Invested"
          percent={catPct.stock}
          amount={fmtAmount(monthByCategory.stock)}
          barClass="stock"
          info={CATEGORY_INFO.stock}
        />
        <CategoryCard
          title="Shopping"
          percent={catPct.shopping}
          amount={fmtAmount(monthByCategory.shopping)}
          barClass="shopping"
          info={CATEGORY_INFO.shopping}
        />
        <CategoryCard
          title="Grocery"
          percent={catPct.grocery}
          amount={fmtAmount(monthByCategory.grocery)}
          barClass="grocery"
          info={CATEGORY_INFO.grocery}
        />
        <CategoryCard
          title="Rent/Bills"
          percent={catPct.rentBills}
          amount={fmtAmount(monthByCategory.rentBills)}
          barClass="rentBills"
          info={CATEGORY_INFO.rentBills}
        />
        <CategoryCard
          title="Other"
          percent={catPct.other}
          amount={fmtAmount(monthByCategory.other)}
          barClass="other"
          info={CATEGORY_INFO.other}
        />
      </div>

      {/* Day-wise table */}
      <div className="ea-table-wrap">
        <table className="ea-table">
          <thead>
            <tr>
              <th className="ea-sticky-day">Day</th>
              <th>Total</th>
              <th>Mutual Fund</th>
              <th>Stock Invested</th>
              <th>Shopping</th>
              <th>Grocery</th>
              <th>Rent/Bills</th>
              <th>Other</th>
              <th className="ea-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: monthDays }, (_, i) => i + 1).map((d) => {
              const rec = totalsByDayInMonth.get(d) || {
                total: 0,
                categories: { ...emptyCats },
              };
              const hasAny = rec.total > 0;
              return (
                <tr key={d}>
                  <td className="ea-sticky-day">{pad2(d)}</td>
                  <td>{fmtAmount(rec.total)}</td>
                  <td>{fmtAmount(rec.categories.mutualFund)}</td>
                  <td>{fmtAmount(rec.categories.stock)}</td>
                  <td>{fmtAmount(rec.categories.shopping)}</td>
                  <td>{fmtAmount(rec.categories.grocery)}</td>
                  <td>{fmtAmount(rec.categories.rentBills)}</td> {/* NEW */}
                  <td>{fmtAmount(rec.categories.other)}</td>
                  <td>
                    <button
                      type="button"
                      className={`ea-edit-btn ${
                        hasAny ? "" : "ea-edit-btn--ghost"
                      }`}
                      onClick={() => openEditor(d)}
                    >
                      {hasAny ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {editingDay && (
        <div
          className="ea-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <div className="ea-modal">
            <div className="ea-modal-header">
              <div className="ea-modal-title">
                Edit entries — {toYMD(year, month, editingDay)}
              </div>
              <button
                className="ea-close"
                type="button"
                onClick={closeEditor}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="ea-modal-body">
              <table className="ea-edit-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ width: 140 }}>Amount</th>
                    <th style={{ width: 90 }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {editRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No entries yet. Click “Add row”.
                      </td>
                    </tr>
                  )}

                  {editRows.map((r) => {
                    const flagged = pendingDeleteIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={flagged ? "ea-row-deleted" : ""}
                      >
                        <td>
                          <select
                            value={r.category}
                            onChange={(e) =>
                              updateRow(r.id, { category: e.target.value })
                            }
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={r.amount}
                            onChange={(e) =>
                              updateRow(r.id, { amount: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`ea-del-btn ${
                              flagged ? "is-active" : ""
                            }`}
                            onClick={() => toggleDelete(r.id)}
                            title={flagged ? "Restore" : "Mark for delete"}
                          >
                            {flagged ? "Restore" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="ea-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addRow}
                >
                  Add row
                </button>
                <div className="spacer" />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEditor}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveChanges}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------ tiny id helper ------------ */
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}

/* ------------ small presentational helpers ------------ */

// Info icon with accessible tooltip (hover & focus)
function Info({ text }) {
  return (
    <span className="ea-info" tabIndex={0} aria-label={text}>
      🛈
      <span className="ea-tooltip" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function CategoryCard({ title, percent, amount, barClass, info }) {
  return (
    <div className="ea-card">
      <div className="ea-card-row">
        <div>
          <strong>{title}</strong>
          <span className="ea-percent">{percent}%</span>
        </div>
        <Info text={info} />
      </div>
      <div className="ea-amount">{amount}</div>
      <div className="ea-bar">
        <div
          className={`ea-bar-fill ${barClass}`}
          style={{ width: percent + "%" }}
        />
      </div>
    </div>
  );
}

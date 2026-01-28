// src/components/monthly-calendar/MonthlyExpenseCalendar.jsx
import { useMemo, useState, useEffect } from "react";
import "./MonthlyExpenseCalendar.css";
import Modal from "../modal/Modal";

import { useAuth } from "../../context/auth-context";
import { upsertDayExpenses } from "../../api/expenses";
import { useToast } from "../toast/ToastProvider";
/**
 * Props:
 *  - year: number
 *  - month: number (1-12)
 *  - onChange: (y:number, m:number) => void
 *  - dayGroups: Array<{
 *      date: 'YYYY-MM-DD',
 *      total?: number,
 *      items: Array<{ id: string, amount: number, category?: string, note?: string }>
 *    }>
 *  - startOnMonday?: boolean
 *  - currency?: 'INR' | 'RS'
 *  - minYearMonth?: { year:number; month:number }
 *  - maxYearMonth?: { year:number; month:number }
 *  - onUpdateDayGroups?: (updatedMonthGroups: any[]) => void  // optional
 */
export default function MonthlyExpenseCalendar({
  year,
  month,
  onChange,
  dayGroups = [],
  startOnMonday = false,
  currency = "RS",
  minYearMonth,
  maxYearMonth,
  onUpdateDayGroups, // optional
}) {
  const { token } = useAuth();
  const toast = useToast(); // ✅ toasts

  const today = new Date();
  const currentYM = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const maxYM = maxYearMonth ?? currentYM;

  // ---------------- Local fallback state ----------------
  // If parent does NOT pass onUpdateDayGroups, we update locally so UI refreshes.
  const [localMonthGroups, setLocalMonthGroups] = useState(dayGroups);
  useEffect(() => setLocalMonthGroups(dayGroups), [dayGroups]);

  const sourceMonthGroups = onUpdateDayGroups ? dayGroups : localMonthGroups;
  // ------------------------------------------------------

  // Helpers
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun..6=Sat
  const toMondayFirst = (d) => (d === 0 ? 6 : d - 1);
  const offset = startOnMonday ? toMondayFirst(startWeekday) : startWeekday;

  const weekLabels = startOnMonday
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // --- Category mapping ---
  const toKey = (raw) => {
    const s = String(raw || "").trim();
    if (s === "Credit Card") return "creditCard";
    if (s === "EMIs") return "emi";
    const l = s.toLowerCase();
    if (l.includes("mutual")) return "mutualFund";
    if (l.includes("stock")) return "stock";
    if (l.includes("shop")) return "shopping";
    if (l.includes("groc")) return "grocery";
    if (l.includes("rent") || l.includes("bill")) return "rentBills";
    if (l === "other") return "other";
    return "other";
  };
  const toBackendLabel = (key) => {
    if (key === "creditCard") return "Credit Card";
    if (key === "emi") return "EMIs";
    return key; // others as-is
  };

  const LABELS = {
    creditCard: "Credit Card",
    emi: "EMIs",
    mutualFund: "Mutual Fund",
    stock: "Stocks",
    shopping: "Shopping",
    grocery: "Grocery",
    rentBills: "Rent/Bills",
    other: "Other",
  };

  const CATEGORY_OPTIONS = [
    { value: "creditCard", label: "Credit Card" },
    { value: "emi", label: "EMIs" },
    { value: "mutualFund", label: "Mutual Fund" },
    { value: "stock", label: "Stocks" },
    { value: "shopping", label: "Shopping" },
    { value: "grocery", label: "Grocery" },
    { value: "rentBills", label: "Rent/Bills" },
    { value: "other", label: "Other" },
  ];

  // --- Colors ---
  const CATEGORY_COLORS = {
    creditCard: "#6366F1",
    emi: "#F59E0B",
    mutualFund: "#53A9EB",
    stock: "#588352FF",
    shopping: "#E955DCFF",
    grocery: "#54D184FF",
    other: "#E26E6F",
    rentBills: "#E98E52FF",
  };
  const getCategoryColor = (catKey) => CATEGORY_COLORS[catKey] || "#999";

  // Build totals & items per day from grouped data
  const { totalsByDay, itemsByDay } = useMemo(() => {
    const totals = new Map();
    const items = new Map();
    for (const g of sourceMonthGroups) {
      const [y, m, d] = g.date.split("-").map(Number);
      if (y === year && m === month) {
        const total =
          typeof g.total === "number"
            ? g.total
            : (g.items || []).reduce(
                (s, it) => s + (Number(it.amount) || 0),
                0
              );

        totals.set(d, (totals.get(d) || 0) + total);
        const arr = items.get(d) || [];
        for (const it of g.items || []) arr.push({ ...it, date: g.date });
        items.set(d, arr);
      }
    }
    return { totalsByDay: totals, itemsByDay: items };
  }, [sourceMonthGroups, year, month]);

  // Per-day totals by category
  const categoryTotalsByDay = useMemo(() => {
    const map = new Map(); // dayNum -> Array<{category, total}>
    for (const [dayNum, items] of itemsByDay.entries()) {
      const acc = new Map(); // catKey -> total
      for (const it of items) {
        const key = toKey(it.category);
        const amt = Number(it.amount) || 0;
        acc.set(key, (acc.get(key) || 0) + amt);
      }
      const arr = Array.from(acc.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
      map.set(dayNum, arr);
    }
    return map;
  }, [itemsByDay]);

  // Top 3 most expensive days
  const top3Days = useMemo(
    () =>
      Array.from(totalsByDay.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([dayNum]) => dayNum),
    [totalsByDay]
  );

  // Calendar cells
  const cells = useMemo(() => {
    const blanksBefore = offset;
    const blanksAfter = 42 - blanksBefore - daysInMonth;
    return [
      ...Array(blanksBefore).fill(null),
      ...Array(daysInMonth)
        .fill(0)
        .map((_, i) => i + 1),
      ...Array(Math.max(0, blanksAfter)).fill(null),
    ];
  }, [offset, daysInMonth]);

  // Navigation with clamps
  const canGoPrev =
    !minYearMonth || isAfterOrEqual({ year, month }, minYearMonth);
  const canGoNext =
    isBeforeOrEqual({ year, month }, maxYM) &&
    !(year === maxYM.year && month === maxYM.month);

  function prevMonth() {
    if (!canGoPrev) return;
    const prev = addMonths({ year, month }, -1);
    if (minYearMonth && isBefore(prev, minYearMonth)) return;
    onChange(prev.year, prev.month);
  }
  function nextMonth() {
    if (!canGoNext) return;
    const next = addMonths({ year, month }, +1);
    if (isAfter(next, maxYM)) return;
    onChange(next.year, next.month);
  }

  const fmtAmount = (n) =>
    currency === "INR"
      ? "₹ " + new Intl.NumberFormat("en-IN").format(n)
      : "₹ " + new Intl.NumberFormat("en-IN").format(n);

  // ---- Modal state (selected day) ----
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setOpenDay(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function openDayModal(dayNum) {
    setOpenDay(dayNum);
  }

  function onDayCellClick(dayNum) {
    const total = totalsByDay.get(dayNum) || 0;
    if (total > 0) openDayModal(dayNum);
  }

  // ---- Add-Expense form state ----
  const [newCat, setNewCat] = useState("other");
  const [newAmt, setNewAmt] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // ---- Helpers for date/permissions ----
  const canEditDay = (y, m, d) => {
    const t = new Date();
    const sel = new Date(y, m - 1, d);
    // Allow only today or past
    return sel <= new Date(t.getFullYear(), t.getMonth(), t.getDate());
  };

  const selectedItems = openDay ? itemsByDay.get(openDay) || [] : [];
  const selectedTotal = selectedItems.reduce(
    (s, it) => s + (Number(it.amount) || 0),
    0
  );
  const selectedDateObj = openDay ? new Date(year, month - 1, openDay) : null;

  const selectedDateYMD =
    selectedDateObj &&
    [
      selectedDateObj.getFullYear(),
      String(selectedDateObj.getMonth() + 1).padStart(2, "0"),
      String(selectedDateObj.getDate()).padStart(2, "0"),
    ].join("-");

  const selectedDateLabel =
    selectedDateObj &&
    new Intl.DateTimeFormat("en", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(selectedDateObj);

  async function handleAddExpense() {
    setSaveErr("");

    if (!openDay || !selectedDateObj) return;
    if (!token) {
      setSaveErr("You must be logged in to add expenses.");
      toast.error("Please log in to add expenses.");
      return;
    }
    if (!canEditDay(year, month, openDay)) {
      setSaveErr("Cannot add to a future date.");
      toast.error("Cannot add to a future date.");
      return;
    }

    const amount = Number(newAmt);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSaveErr("Please enter a valid amount greater than 0.");
      toast.error("Amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      // Merge existing items by category and add the new one
      const bucket = new Map(); // key -> { total, note? }
      for (const it of selectedItems) {
        const key = toKey(it.category);
        const amt = Number(it.amount) || 0;
        const note = typeof it.note === "string" ? it.note.trim() : "";
        if (amt <= 0) continue;
        if (!bucket.has(key)) bucket.set(key, { total: 0, note: "" });
        const b = bucket.get(key);
        b.total += amt;
        if (!b.note && note) b.note = note;
      }

      const k = newCat || "other";
      if (!bucket.has(k)) bucket.set(k, { total: 0, note: "" });
      const b = bucket.get(k);
      b.total += amount;
      const trimmedNote = String(newNote || "")
        .trim()
        .slice(0, 200);
      if (!b.note && trimmedNote) b.note = trimmedNote;

      // Build backend payload
      const items = [];
      for (const [key, info] of bucket) {
        const payload = { amount: info.total, category: toBackendLabel(key) };
        if (info.note) payload.note = info.note;
        items.push(payload);
      }

      const resp = await upsertDayExpenses({
        date: selectedDateYMD,
        items,
        token,
      });

      const updatedMonthGroups = resp?.month ?? [];

      // ✅ Update UI:
      if (typeof onUpdateDayGroups === "function") {
        // parent controls the month; await in case it's async
        await Promise.resolve(onUpdateDayGroups(updatedMonthGroups));
      } else if (
        Array.isArray(updatedMonthGroups) &&
        updatedMonthGroups.length
      ) {
        // local fallback so the grid re-renders without parent
        setLocalMonthGroups(updatedMonthGroups);
      }

      // ✅ Reset form & close modal
      setNewAmt("");
      setNewNote("");
      setNewCat("other");
      setOpenDay(null); // <<< close

      // ✅ toast
      const label = LABELS[k] || k;
      toast.success(
        `Added ${fmtAmount(amount)} to ${label} on ${selectedDateYMD}`
      );
    } catch (e) {
      console.error(e);
      const msg = e?.message || "Failed to add expense.";
      setSaveErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      {/* Header */}
      <div className="cal-header">
        <button
          className={`btn-secondary cal-nav ${canGoPrev ? "" : "disabled"}`}
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          title="Previous month"
        >
          ◀
        </button>
        <div className="cal-title">
          {year}, {monthName}
        </div>
        <button
          className={`btn-secondary cal-nav ${canGoNext ? "" : "disabled"}`}
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
          title="Next month"
        >
          ▶
        </button>
      </div>

      {/* Weekday labels */}
      <div className="cal-grid cal-week" role="row">
        {weekLabels.map((lbl, i) => (
          <div key={`${lbl}-${i}`} className="cal-weekcell" role="columnheader">
            {lbl}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="cal-grid cal-days">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="cal-cell cal-empty"
                aria-hidden="true"
              />
            );
          }
          const total = totalsByDay.get(dayNum) || 0;
          const clickable = total > 0;
          const isTop = top3Days.includes(dayNum);
          const catTotals = categoryTotalsByDay.get(dayNum) || [];

          const MAX_BADGES = 3;
          const visibleBadges = catTotals.slice(0, MAX_BADGES);
          const overflowCount = Math.max(0, catTotals.length - MAX_BADGES);
          const showCatRow = visibleBadges.length > 0;

          const canAddHere = canEditDay(year, month, dayNum);

          return (
            <div
              key={`day-${dayNum}-${idx}`}
              className={`cal-cell-wrap ${isTop ? "cal-top-expense" : ""}`}
            >
              <button
                type="button"
                className={`cal-cell ${total > 0 ? "has-expense" : ""} ${
                  clickable ? "cal-clickable" : ""
                } ${!canAddHere ? "cal-future" : ""}`}
                onClick={() => clickable && onDayCellClick(dayNum)}
                aria-label={
                  clickable
                    ? `Open details for ${year}-${String(month).padStart(
                        2,
                        "0"
                      )}-${String(dayNum).padStart(
                        2,
                        "0"
                      )} with total ${fmtAmount(total)}.`
                    : `${year}-${String(month).padStart(2, "0")}-${String(
                        dayNum
                      ).padStart(2, "0")} (no expenses)`
                }
                disabled={!clickable}
              >
                <div className="cal-daynum-badge" aria-hidden="true">
                  {dayNum}
                </div>

                {total > 0 && (
                  <div className="cal-amount">{fmtAmount(total)}</div>
                )}

                {showCatRow && (
                  <div className="cal-catrow" aria-hidden="true">
                    {visibleBadges.map((ct, i) => (
                      <div
                        key={`badge-${dayNum}-${ct.category}-${i}`}
                        className="cal-cat-badge"
                        style={{
                          backgroundColor: getCategoryColor(ct.category),
                        }}
                        title={`${
                          LABELS[ct.category] || ct.category
                        }: ${fmtAmount(ct.total)}`}
                      >
                        <span className="cal-cat-amt">
                          {fmtAmount(ct.total)}
                        </span>
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <div
                        className="cal-cat-badge cal-cat-more"
                        title={`+${overflowCount} more categories`}
                      >
                        +{overflowCount}
                      </div>
                    )}
                  </div>
                )}
              </button>

              {/* Add (+) overlay — opens modal for any day */}
              <button
                type="button"
                className="cal-add-btn"
                onClick={() => canAddHere && openDayModal(dayNum)}
                aria-label={`Add expense for ${year}-${String(month).padStart(
                  2,
                  "0"
                )}-${String(dayNum).padStart(2, "0")}`}
                title={
                  canAddHere ? "Add expense" : "Future date—adding disabled"
                }
                disabled={!canAddHere || saving}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal with items + Add form */}
      <Modal
        open={!!openDay}
        onClose={() => setOpenDay(null)}
        ariaLabel="Day details"
      >
        <div className="modal-head">
          <h4 className="modal-title">{selectedDateLabel}</h4>
          <button
            className="ea-close"
            onClick={() => setOpenDay(null)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {selectedItems.length > 0 ? (
          <ul className="modal-list">
            {selectedItems.map((item, i) => {
              const key = toKey(item.category);
              return (
                <li key={`exp-${item.id || i}`} className="modal-list-item">
                  <div className="item-line">
                    <span
                      className="item-dot"
                      style={{ backgroundColor: getCategoryColor(key) }}
                      aria-hidden="true"
                    />
                    <span className="item-category">{LABELS[key] || key}</span>
                    <span className="item-amount">
                      {fmtAmount(item.amount)}
                    </span>
                  </div>
                  {item.note ? (
                    <div className="item-note muted" style={{ marginLeft: 24 }}>
                      {item.note}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">No entries for this day.</p>
        )}

        <div className="modal-total">
          <span className="muted">Total</span>
          <strong>{fmtAmount(selectedTotal)}</strong>
        </div>

        {/* Add Expense form */}
        {openDay && (
          <>
            <hr className="add-sep" />
            <h4 style={{marginBottom:12}}>Add Expense</h4>
            <div className="add-form">
              <div className="add-form-row">
                <label className="add-label" htmlFor="add-cat">
                  Category
                </label>
                <select
                  id="add-cat"
                  className="add-select"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="add-form-row">
                <label className="add-label" htmlFor="add-amt">
                  Amount
                </label>
                <input
                  id="add-amt"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={newAmt}
                  onChange={(e) => setNewAmt(e.target.value)}
                  placeholder="0"
                  className="add-input"
                />
              </div>

              <div className="add-form-row add-form-row--note">
                <label className="add-label" htmlFor="add-note">
                  Note
                </label>
                <input
                  id="add-note"
                  type="text"
                  maxLength={200}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value.slice(0, 200))}
                  placeholder="Add a short note…"
                  className="add-input"
                />
              </div>

              {saveErr && (
                <div className="inline-error" style={{ gridColumn: "1 / -1" }}>
                  <span>⚠️ {saveErr}</span>
                </div>
              )}

              <div className="add-actions" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginRight: 8 }}
                  onClick={() => {
                    setNewAmt("");
                    setNewNote("");
                    setNewCat("other");
                    setSaveErr("");
                  }}
                  disabled={saving}
                >
                  Clear
                </button>

                <div className="spacer" />

                <button
                  type="button"
                  className="btn-primary"
                  onClick={saving ? undefined : handleAddExpense}
                  disabled={saving || !token}
                  aria-disabled={saving || !token}
                  title={!token ? "Login required" : "Save new expense"}
                >
                  {saving ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}

/* ------------ Small Date Helpers ------------ */
function addMonths({ year, month }, delta) {
  const d = new Date(year, month - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
function isBefore(a, b) {
  return a.year < b.year || (a.year === b.year && a.month < b.month);
}
function isAfter(a, b) {
  return a.year > b.year || (a.year === b.year && a.month > b.month);
}
function isBeforeOrEqual(a, b) {
  return !isAfter(a, b);
}
function isAfterOrEqual(a, b) {
  return !isBefore(a, b);
}

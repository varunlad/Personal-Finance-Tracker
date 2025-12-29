import { useMemo, useState } from "react"
import "./ExpenseAnalysis.css"

import HeaderControls from "./HeaderControls.jsx"
import SummaryCards from "./SummaryCards.jsx"
import DayTable from "./DayTable.jsx"
import EditorModal from "./EditorModal.jsx"

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
  onUpdateExpenses,
}) {
  /* ---------- Helpers ---------- */
  const pad2 = (n) => String(n).padStart(2, "0")

  const fmtAmount = (n) =>
    currency === "INR" || currency === "RS"
      ? "₹ " + new Intl.NumberFormat("en-IN").format(n)
      : new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n)

  const parseYMD = (s) => {
    const [y, m, d] = s.split("-").map(Number)
    return { y, m, d }
  }
  const toYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate()

  const normalizeCat = (c) => {
    const s = String(c || "other").toLowerCase()
    if (s.includes("mutual")) return "mutualFund"
    if (s.includes("stock")) return "stock"
    if (s.includes("shop")) return "shopping"
    if (s.includes("groc")) return "grocery"
    if (s.includes("rent") || s.includes("bill")) return "rentBills"
    return "other"
  }

  const CATEGORY_OPTIONS = [
    { value: "mutualFund", label: "Mutual Fund" },
    { value: "stock", label: "Stock Invested" },
    { value: "shopping", label: "Shopping" },
    { value: "grocery", label: "Grocery" },
    { value: "rentBills", label: "Rent/Bills" },
    { value: "other", label: "Other" },
  ]

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emptyCats = {
    mutualFund: 0,
    stock: 0,
    shopping: 0,
    grocery: 0,
    rentBills: 0,
    other: 0,
  }

  // Edit restrictions: no future dates
  const now = new Date()
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
  const cmpYM = (a, b) => (a.y === b.y ? a.m - b.m : a.y - b.y)
  const canEditDay = (year, month, day) => {
    const sel = { y: year, m: month }
    const tYM = { y: today.y, m: today.m }
    const diff = cmpYM(sel, tYM)
    if (diff > 0) return false         // future month
    if (diff < 0) return true          // past month
    return day <= today.d              // same month: only up to today
  }

  /* ---------- Initial selection ---------- */
  const allYM = useMemo(() => {
    const set = new Set(
      expenses.map((e) => {
        const { y, m } = parseYMD(e.date)
        return `${y}-${pad2(m)}`
      })
    )
    return Array.from(set).sort()
  }, [expenses])

  let defaultYear = today.y
  let defaultMonth = today.m
  if (allYM.length) {
    const [yStr, mStr] = allYM[allYM.length - 1].split("-")
    defaultYear = Number(yStr)
    defaultMonth = Number(mStr)
  }

  const [year, setYear] = useState(initialYear ?? defaultYear)
  const [month, setMonth] = useState(initialMonth ?? defaultMonth)

  /* ---------- Filtering & Aggregations ---------- */
  const monthExpenses = useMemo(
    () => expenses.filter((e) => {
      const { y, m } = parseYMD(e.date)
      return y === year && m === month
    }),
    [expenses, year, month]
  )

  const monthTotal = useMemo(() => {
    let t = 0
    for (const e of monthExpenses) t += Number(e.amount) || 0
    return t
  }, [monthExpenses])

  const monthByCategory = useMemo(() => {
    const cat = { ...emptyCats }
    for (const e of monthExpenses) {
      cat[normalizeCat(e.category)] += Number(e.amount) || 0
    }
    return cat
  }, [emptyCats, monthExpenses])

  const totalsByDayInMonth = useMemo(() => {
    const map = new Map()
    for (const e of monthExpenses) {
      const { d } = parseYMD(e.date)
      const c = normalizeCat(e.category)
      const amt = Number(e.amount) || 0
      if (!map.has(d)) map.set(d, { total: 0, categories: { ...emptyCats } })
      const rec = map.get(d)
      rec.total += amt
      rec.categories[c] += amt
    }
    return map
  }, [emptyCats, monthExpenses])

  /* ---------- Editor state ---------- */
  const [editingDay, setEditingDay] = useState(null)
  const [editRows, setEditRows] = useState([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState(new Set())

  function openEditor(dayNum) {
    if (!canEditDay(year, month, dayNum)) return

    const dateStr = toYMD(year, month, dayNum)
    const indexesForDay = []
    for (let i = 0; i < expenses.length; i++) {
      if (expenses[i].date === dateStr) indexesForDay.push(i)
    }
    const rows = []
    let idxPos = 0
    for (const e of monthExpenses) {
      const { d } = parseYMD(e.date)
      if (d === dayNum) {
        const originalIndex = indexesForDay[idxPos] ?? -1
        idxPos++
        rows.push({
          id: cryptoRandomId(),
          amount: Number(e.amount) || 0,
          category: normalizeCat(e.category),
          originalIndex,
          isNew: false,
        })
      }
    }
    setEditingDay(dayNum)
    setEditRows(rows)
    setPendingDeleteIds(new Set())
  }

  function closeEditor() {
    setEditingDay(null)
    setEditRows([])
    setPendingDeleteIds(new Set())
  }

  function addRow() {
    if (editingDay && !canEditDay(year, month, editingDay)) return
    setEditRows((rows) => [
      ...rows,
      { id: cryptoRandomId(), amount: 0, category: "other", originalIndex: -1, isNew: true },
    ])
  }

  function updateRow(id, patch) {
    setEditRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function toggleDelete(id) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function saveChanges() {
    if (!onUpdateExpenses) {
      console.warn("onUpdateExpenses is not provided. Changes will not persist.")
      closeEditor()
      return
    }
    const dateStr = toYMD(year, month, editingDay)
    const next = expenses.slice()
    // apply edits & deletes
    for (const r of editRows) {
      const isDelete = pendingDeleteIds.has(r.id)
      if (r.originalIndex >= 0) {
        if (isDelete) {
          next.splice(r.originalIndex, 1)
        } else {
          next[r.originalIndex] = {
            ...next[r.originalIndex],
            date: dateStr,
            amount: Number(r.amount) || 0,
            category: r.category,
          }
        }
      } else {
        if (!isDelete) {
          next.push({ date: dateStr, amount: Number(r.amount) || 0, category: r.category })
        }
      }
    }
    onUpdateExpenses(next)
    closeEditor()
  }

  /* ---------- UI derivations ---------- */
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  )
  const monthDays = daysInMonth(year, month)
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

  const catPct = {
    mutualFund: pct(monthByCategory.mutualFund, monthTotal),
    stock: pct(monthByCategory.stock, monthTotal),
    shopping: pct(monthByCategory.shopping, monthTotal),
    grocery: pct(monthByCategory.grocery, monthTotal),
    rentBills: pct(monthByCategory.rentBills, monthTotal),
    other: pct(monthByCategory.other, monthTotal),
  }

  /* ---------- Render ---------- */
  return (
    <section className="card">
      <HeaderControls
        year={year}
        month={month}
        expenses={expenses}
        setYear={setYear}
        setMonth={setMonth}
        parseYMD={parseYMD}
      />

      <div className="ea-subtitle">{monthName} {year}</div>

      <SummaryCards
        fmtAmount={fmtAmount}
        monthTotal={monthTotal}
        catPct={catPct}
        monthByCategory={monthByCategory}
      />

      <DayTable
        year={year}
        month={month}
        monthDays={monthDays}
        totalsByDayInMonth={totalsByDayInMonth}
        emptyCats={emptyCats}
        fmtAmount={fmtAmount}
        pad2={pad2}
        canEditDay={canEditDay}
        onOpenEditor={openEditor}
      />

      <EditorModal
        editingDay={editingDay}
        categoryOptions={CATEGORY_OPTIONS}
        editRows={editRows}
        pendingDeleteIds={pendingDeleteIds}
        addRow={addRow}
        updateRow={updateRow}
        toggleDelete={toggleDelete}
        saveChanges={saveChanges}
        closeEditor={closeEditor}
        toYMD={toYMD}
        year={year}
        month={month}
        canEditDay={canEditDay}
      />
    </section>
  )
}

/* ---------- tiny id helper ---------- */
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return "id-" + Math.random().toString(36).slice(2)
}

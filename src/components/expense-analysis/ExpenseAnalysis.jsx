
// src/components/expense-analysis/ExpenseAnalysis.jsx
import { useMemo, useState, useEffect } from "react"
import "./ExpenseAnalysis.css"

import HeaderControls from "./HeaderControls.jsx"
import SummaryCards from "./SummaryCards.jsx"
import DayTable from "./DayTable.jsx"
import EditorModal from "./EditorModal.jsx"

export default function ExpenseAnalysis({
  dayGroups = [],
  currency = "RS",
  initialYear,
  initialMonth,
  onUpdateDayGroups,
}) {
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

  const now = new Date()
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
  const cmpYM = (a, b) => (a.y === b.y ? a.m - b.m : a.y - b.y)
  const canEditDay = (year, month, day) => {
    const sel = { y: year, m: month }
    const tYM = { y: today.y, m: today.m }
    const diff = cmpYM(sel, tYM)
    if (diff > 0) return false
    if (diff < 0) return true
    return day <= today.d
  }

  const flatAll = useMemo(() => {
    const out = []
    for (const g of dayGroups) {
      for (const it of g.items || []) {
        out.push({
          id: it.id,
          date: g.date,
          amount: Number(it.amount) || 0,
          category: normalizeCat(it.category),
        })
      }
    }
    return out
  }, [dayGroups])

  const allYM = useMemo(() => {
    const set = new Set(flatAll.map((e) => {
      const { y, m } = parseYMD(e.date)
      return `${y}-${pad2(m)}`
    }))
    return Array.from(set).sort()
  }, [flatAll])

  let defaultYear = today.y
  let defaultMonth = today.m
  if (allYM.length) {
    const [yStr, mStr] = allYM[allYM.length - 1].split("-")
    defaultYear = Number(yStr)
    defaultMonth = Number(mStr)
  }

  const [year, setYear] = useState(initialYear ?? defaultYear)
  const [month, setMonth] = useState(initialMonth ?? defaultMonth)

  const groupsForMonth = useMemo(
    () => dayGroups.filter((g) => {
      const { y, m } = parseYMD(g.date)
      return y === year && m === month
    }),
    [dayGroups, year, month]
  )

  const monthTotal = useMemo(() => {
    let t = 0
    for (const g of groupsForMonth) {
      if (typeof g.total === 'number') t += g.total
      else t += (g.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)
    }
    return t
  }, [groupsForMonth])

  const monthByCategory = useMemo(() => {
    const cat = { ...emptyCats }
    for (const g of groupsForMonth) {
      for (const it of g.items || []) {
        cat[normalizeCat(it.category)] += Number(it.amount) || 0
      }
    }
    return cat
  }, [emptyCats, groupsForMonth])

  const totalsByDayInMonth = useMemo(() => {
    const map = new Map()
    for (const g of groupsForMonth) {
      const { d } = parseYMD(g.date)
      const total = typeof g.total === 'number'
        ? g.total
        : (g.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)

      if (!map.has(d)) map.set(d, { total: 0, categories: { ...emptyCats } })
      const rec = map.get(d)
      rec.total += total
      for (const it of g.items || []) {
        const c = normalizeCat(it.category)
        rec.categories[c] += Number(it.amount) || 0
      }
    }
    return map
  }, [emptyCats, groupsForMonth])

  const [editingDay, setEditingDay] = useState(null)
  const [editRows, setEditRows] = useState([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState(new Set())

  function openEditor(dayNum) {
    if (!canEditDay(year, month, dayNum)) return
    const dateStr = toYMD(year, month, dayNum)
    const group = dayGroups.find((g) => g.date === dateStr)
    const rows = []

    if (group && Array.isArray(group.items)) {
      for (const it of group.items) {
        rows.push({
          id: cryptoRandomId(),
          expenseId: it.id,
          amount: Number(it.amount) || 0,
          category: normalizeCat(it.category),
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
      { id: cryptoRandomId(), expenseId: null, amount: 0, category: "other", isNew: true },
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
    if (!onUpdateDayGroups) {
      console.warn("onUpdateDayGroups is not provided. Changes will not persist.")
      closeEditor()
      return
    }

    const dateStr = toYMD(year, month, editingDay)
    const nextGroups = dayGroups.slice()
    const idx = nextGroups.findIndex((g) => g.date === dateStr)

    const nextItems = []
    for (const r of editRows) {
      const isDelete = pendingDeleteIds.has(r.id)
      if (isDelete) continue

      const amt = Number(r.amount) || 0
      const cat = normalizeCat(r.category)

      if (r.expenseId) {
        nextItems.push({ id: r.expenseId, amount: amt, category: cat })
      } else {
        nextItems.push({ id: cryptoRandomId(), amount: amt, category: cat })
      }
    }

    const newTotal = nextItems.reduce((s, it) => s + (Number(it.amount) || 0), 0)

    if (nextItems.length === 0) {
      if (idx >= 0) nextGroups.splice(idx, 1)
    } else {
      const updated = { date: dateStr, items: nextItems, total: newTotal }
      if (idx >= 0) nextGroups[idx] = updated
      else nextGroups.push(updated)
    }

    onUpdateDayGroups(nextGroups) // parent merges month into summary + sets month view
    closeEditor()
  }

  useEffect(() => {
    const isOpen = editingDay !== null
    if (!isOpen) return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`
    }

    const preventTouchScroll = (e) => {
      const modalPanel = document.querySelector(".ea-modal")
      if (modalPanel && modalPanel.contains(e.target)) {
        return
      }
      e.preventDefault()
    }

    document.addEventListener("touchmove", preventTouchScroll, { passive: false })

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      document.removeEventListener("touchmove", preventTouchScroll)
    }
  }, [editingDay])

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

  return (
    <section className="card">
      <HeaderControls
        year={year}
        month={month}
        expenses={flatAll}
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

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return "id-" + Math.random().toString(36).slice(2)
}

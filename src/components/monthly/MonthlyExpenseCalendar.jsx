
import { useMemo, useState, useEffect } from 'react'
import './MonthlyExpenseCalendar.css'
import Modal from '../modal/Modal'

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
 */
export default function MonthlyExpenseCalendar({
  year,
  month,
  onChange,
  dayGroups = [],
  startOnMonday = false,
  currency = 'RS',
  minYearMonth,
  maxYearMonth,
}) {
  const today = new Date()
  const currentYM = { year: today.getFullYear(), month: today.getMonth() + 1 }
  const maxYM = maxYearMonth ?? currentYM

  // Helpers
  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(
    new Date(year, month - 1, 1)
  )
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1)
  const startWeekday = firstDay.getDay() // 0=Sun..6=Sat
  const toMondayFirst = (d) => (d === 0 ? 6 : d - 1)
  const offset = startOnMonday ? toMondayFirst(startWeekday) : startWeekday

  const weekLabels = startOnMonday
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // --- Category mapping ---
  // Convert raw backend string to internal key
  const toKey = (raw) => {
    const s = String(raw || '').trim()
    if (s === 'Credit Card') return 'creditCard'
    if (s === 'EMIs') return 'emi'
    const l = s.toLowerCase()
    if (l.includes('mutual')) return 'mutualFund'
    if (l.includes('stock')) return 'stock'
    if (l.includes('shop')) return 'shopping'
    if (l.includes('groc')) return 'grocery'
    if (l.includes('rent') || l.includes('bill')) return 'rentBills'
    if (l === 'other') return 'other'
    return 'other'
  }
  const LABELS = {
    creditCard: 'Credit Card',
    emi: 'EMIs',
    mutualFund: 'Mutual Fund',
    stock: 'Stocks',
    shopping: 'Shopping',
    grocery: 'Grocery',
    rentBills: 'Rent/Bills',
    other: 'Other',
  }

  // --- Colors (added new ones for Credit Card & EMIs) ---
  const CATEGORY_COLORS = {
    creditCard: '#6366F1', // Indigo 500
    emi: '#F59E0B',        // Amber 500
    mutualFund: '#53A9EB',
    stock: '#588352FF',
    shopping: '#E955DCFF',
    grocery: '#54D184FF',
    other: '#E26E6F',
    rentBills: '#E98E52FF',
  }

  const getCategoryColor = (catKey) => CATEGORY_COLORS[catKey] || '#999'

  // Build totals & items per day from grouped data
  const { totalsByDay, itemsByDay } = useMemo(() => {
    const totals = new Map()
    const items = new Map()
    for (const g of dayGroups) {
      const [y, m, d] = g.date.split('-').map(Number)
      if (y === year && m === month) {
        const total =
          typeof g.total === 'number'
            ? g.total
            : (g.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)

        totals.set(d, (totals.get(d) || 0) + total)
        const arr = items.get(d) || []
        for (const it of g.items || []) arr.push({ ...it, date: g.date })
        items.set(d, arr)
      }
    }
    return { totalsByDay: totals, itemsByDay: items }
  }, [dayGroups, year, month])

  // Per-day totals by category (sum items for the day by category)
  const categoryTotalsByDay = useMemo(() => {
    const map = new Map() // dayNum -> Array<{category, total}>
    for (const [dayNum, items] of itemsByDay.entries()) {
      const acc = new Map() // catKey -> total
      for (const it of items) {
        const key = toKey(it.category)
        const amt = Number(it.amount) || 0
        acc.set(key, (acc.get(key) || 0) + amt)
      }
      const arr = Array.from(acc.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
      map.set(dayNum, arr)
    }
    return map
  }, [itemsByDay])

  // Top 3 most expensive days
  const top3Days = useMemo(() => {
    return Array.from(totalsByDay.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([dayNum]) => dayNum)
  }, [totalsByDay])

  // Calendar cells
  const cells = useMemo(() => {
    const blanksBefore = offset
    const blanksAfter = 42 - blanksBefore - daysInMonth
    return [
      ...Array(blanksBefore).fill(null),
      ...Array(daysInMonth).fill(0).map((_, i) => i + 1),
      ...Array(Math.max(0, blanksAfter)).fill(null),
    ]
  }, [offset, daysInMonth])

  // Navigation with clamps
  const canGoPrev = !minYearMonth || isAfterOrEqual({ year, month }, minYearMonth)
  const canGoNext =
    isBeforeOrEqual({ year, month }, maxYM) &&
    !(year === maxYM.year && month === maxYM.month)

  function prevMonth() {
    if (!canGoPrev) return
    const prev = addMonths({ year, month }, -1)
    if (minYearMonth && isBefore(prev, minYearMonth)) return
    onChange(prev.year, prev.month)
  }
  function nextMonth() {
    if (!canGoNext) return
    const next = addMonths({ year, month }, +1)
    if (isAfter(next, maxYM)) return
    onChange(next.year, next.month)
  }

  const fmtAmount = (n) =>
    currency === 'INR'
      ? '₹ ' + new Intl.NumberFormat('en-IN').format(n)
      : '₹ ' + new Intl.NumberFormat('en-IN').format(n)

  // Modal state
  const [openDay, setOpenDay] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setOpenDay(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function onDayClick(dayNum) {
    const has = (totalsByDay.get(dayNum) || 0) > 0
    if (has) setOpenDay(dayNum)
  }

  const selectedItems = openDay ? (itemsByDay.get(openDay) || []) : []
  const selectedTotal = selectedItems.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const selectedDateObj = openDay ? new Date(year, month - 1, openDay) : null
  const selectedDateLabel =
    selectedDateObj &&
    new Intl.DateTimeFormat('en', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(selectedDateObj)

  return (
    <section className="card">
      {/* Header */}
      <div className="cal-header">
        <button
          className={`btn-secondary cal-nav ${canGoPrev ? '' : 'disabled'}`}
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
        >
          ◀
        </button>
        <div className="cal-title">
          {year}, {monthName}
        </div>
        <button
          className={`btn-secondary cal-nav ${canGoNext ? '' : 'disabled'}`}
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          ▶
        </button>
      </div>

      {/* Weekday labels */}
      <div className="cal-grid cal-week">
        {weekLabels.map((lbl, i) => (
          <div key={`${lbl}-${i}`} className="cal-weekcell">
            {lbl}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="cal-grid cal-days">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} className="cal-cell cal-empty" />
          }
          const total = totalsByDay.get(dayNum) || 0
          const clickable = total > 0
          const isTop = top3Days.includes(dayNum)
          const catTotals = categoryTotalsByDay.get(dayNum) || []

          const MAX_BADGES = 3
          const visibleBadges = catTotals.slice(0, MAX_BADGES)
          const overflowCount = Math.max(0, catTotals.length - MAX_BADGES)
          const showCatRow = visibleBadges.length > 0

          const catSummary =
            visibleBadges
              .map(ct => `${LABELS[ct.category] || ct.category} ${fmtAmount(ct.total)}`)
              .join(', ') + (overflowCount ? `, +${overflowCount} more` : '')

          return (
            <button
              key={`day-${dayNum}-${idx}`}
              type="button"
              className={`cal-cell ${total > 0 ? 'has-expense' : ''} ${clickable ? 'cal-clickable' : ''} ${isTop ? 'cal-top-expense' : ''}`}
              onClick={() => clickable && onDayClick(dayNum)}
              aria-label={
                clickable
                  ? `Open details for ${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')} with total ${fmtAmount(total)}. Categories: ${catSummary}`
                  : `No expenses on ${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
              }
              disabled={!clickable}
            >
              <div className="cal-daynum">{dayNum}</div>

              {total > 0 && <div className="cal-amount">{fmtAmount(total)}</div>}

              {showCatRow && (
                <div className="cal-catrow" aria-hidden="true">
                  {visibleBadges.map((ct, i) => (
                    <div
                      key={`badge-${dayNum}-${ct.category}-${i}`}
                      className="cal-cat-badge"
                      style={{ backgroundColor: getCategoryColor(ct.category) }}
                      title={`${LABELS[ct.category] || ct.category}: ${fmtAmount(ct.total)}`}
                    >
                      <span className="cal-cat-amt">{fmtAmount(ct.total)}</span>
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
          )
        })}
      </div>

      {/* Modal with line items incl. notes */}
      <Modal open={!!openDay} onClose={() => setOpenDay(null)} ariaLabel="Day details">
        <h4 className="modal-title">{selectedDateLabel}</h4>
        <div className="modal-total">
          <span className="muted">Total</span>
          <strong>{fmtAmount(selectedTotal)}</strong>
        </div>
        {selectedItems.length > 0 ? (
          <ul className="modal-list">
            {selectedItems.map((item, i) => {
              const key = toKey(item.category)
              return (
                <li key={`exp-${item.id || i}`} className="modal-list-item">
                  <div className="item-line">
                    <span
                      className="item-dot"
                      style={{ backgroundColor: getCategoryColor(key) }}
                      aria-hidden="true"
                    />
                    <span className="item-category">{LABELS[key] || key}</span>
                    <span className="item-amount">{fmtAmount(item.amount)}</span>
                  </div>
                  {item.note ? (
                    <div className="item-note muted" style={{ marginLeft: 24 }}>
                      {item.note}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">No entries for this day.</p>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setOpenDay(null)}>Close</button>
        </div>
      </Modal>
    </section>
  )
}

/* ------------ Small Date Helpers ------------ */
function addMonths({ year, month }, delta) {
  const d = new Date(year, month - 1, 1)
  d.setMonth(d.getMonth() + delta)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
function isBefore(a, b) {
  return a.year < b.year || (a.year === b.year && a.month < b.month)
}
function isAfter(a, b) {
  return a.year > b.year || (a.year === b.year && a.month > b.month)
}
function isBeforeOrEqual(a, b) { return !isAfter(a, b) }
function isAfterOrEqual(a, b) { return !isBefore(a, b) }

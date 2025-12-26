
import { useMemo, useState, useEffect } from 'react'
import './MonthlyExpenseCalendar.css'
import Modal from '../modal/Modal'

/**
 * Props:
 *  - year: number
 *  - month: number (1-12)
 *  - onChange: (y:number, m:number) => void
 *  - expenses: Array<{ date: 'YYYY-MM-DD', amount: number, category?: string }>
 *  - startOnMonday?: boolean
 *  - currency?: 'INR' | 'RS'
 *  - minYearMonth?: { year:number; month:number }
 *  - maxYearMonth?: { year:number; month:number }
 */
export default function MonthlyExpenseCalendar({
  year,
  month,
  onChange,
  expenses = [],
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

  // Build totals per day (summing multiple entries)
  const totalsByDay = useMemo(() => {
    const map = new Map()
    for (const e of expenses) {
      const [y, m, d] = e.date.split('-').map(Number)
      if (y === year && m === month) {
        map.set(d, (map.get(d) || 0) + Number(e.amount || 0))
      }
    }
    return map
  }, [expenses, year, month])

  // Build items per day (for modal listing)
  const itemsByDay = useMemo(() => {
    const map = new Map()
    for (const e of expenses) {
      const [y, m, d] = e.date.split('-').map(Number)
      if (y === year && m === month) {
        const arr = map.get(d) || []
        arr.push(e)
        map.set(d, arr)
      }
    }
    return map
  }, [expenses, year, month])

  // Calendar cells (6 rows * 7 cols = 42)
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
      : 'Rs. ' + new Intl.NumberFormat('en-IN').format(n)

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
          return (
            <button
              key={`day-${dayNum}-${idx}`}
              type="button"
              className={`cal-cell ${total > 0 ? 'has-expense' : ''} ${clickable ? 'cal-clickable' : ''}`}
              onClick={() => clickable && onDayClick(dayNum)}
              aria-label={
                clickable
                  ? `Open details for ${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')} with total ${fmtAmount(total)}`
                  : `No expenses on ${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
              }
              disabled={!clickable}
            >
              <div className="cal-daynum">{dayNum}</div>
              {total > 0 && <div className="cal-amount">{fmtAmount(total)}</div>}
            </button>
          )
        })}
      </div>

      {/* Modal with line items */}
      <Modal open={!!openDay} onClose={() => setOpenDay(null)} ariaLabel="Day details">
        <h4 className="modal-title">{selectedDateLabel}</h4>
        <div className="modal-total">
          <span className="muted">Total</span>
          <strong>{fmtAmount(selectedTotal)}</strong>
        </div>
        {selectedItems.length > 0 ? (
          <ul className="modal-list">
            {selectedItems.map((item, i) => (
              <li key={`exp-${i}`} className="modal-list-item">
                <div className="item-line">
                  <span className="item-date">{item.category || 'other'}</span>
                  <span className="item-amount">{fmtAmount(item.amount)}</span>
                </div>
              </li>
            ))}
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

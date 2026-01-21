
// src/components/profile/utils/recurrence.js

// Period lengths in months
export const PERIOD_MONTHS = {
  monthly: 1,
  quarterly: 3,
  'half-yearly': 6,
  yearly: 12,
}

// Parse yyyy-mm-dd safely without TZ issues
const parseDate = (s) => (s ? new Date(`${s}T00:00:00`) : null)

// Clamp date to first day of month
const monthStart = (y, m) => new Date(y, m, 1)
const monthEnd = (y, m) => new Date(y, m + 1, 0)

// Whole months between two dates ignoring days
export function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function inRangeMonth(item, y, m) {
  const start = parseDate(item.startDate)
  if (!start) return false
  const end = item.endDate ? parseDate(item.endDate) : null

  const targetStartMs = monthStart(y, m).getTime()
  const targetEndMs = monthEnd(y, m).getTime()
  if (targetEndMs < start.getTime()) return false
  if (end && targetStartMs > end.getTime()) return false
  return true
}

function occursInMonth(item, y, m) {
  const start = parseDate(item.startDate)
  if (!start) return false

  if (item.recurrence === 'one-time') {
    return start.getFullYear() === y && start.getMonth() === m
  }

  const period = PERIOD_MONTHS[item.recurrence]
  if (!period) return false

  const diff = monthsBetween(start, new Date(y, m, 1))
  // occurs if diff is >= 0 and divisible by period
  return diff >= 0 && diff % period === 0
}

function stepUpK(item, y, m) {
  const s = parseDate(item.startDate)
  if (!s) return 0
  const step = item.stepUp
  if (!step || !step.enabled) return 0

  const from = parseDate(step.from || item.startDate)
  const everyMonths = step.every === '12m' ? 12 : 6
  const diff = monthsBetween(from, new Date(y, m, 1))
  if (diff < 0) return 0
  return Math.floor(diff / everyMonths)
}

function applyStepUp(baseAmount, step, k) {
  if (!step || !step.enabled || k <= 0) return baseAmount
  if (step.mode === 'amount') {
    // + ₹N every step
    return baseAmount + k * Number(step.value || 0)
  }
  if (step.mode === 'percent') {
    // compound % every step
    const p = Number(step.value || 0) / 100
    return Math.round(baseAmount * Math.pow(1 + p, k))
  }
  return baseAmount
}

export function amountForItemInMonth(item, y, m) {
  if (!inRangeMonth(item, y, m)) return 0
  if (!occursInMonth(item, y, m)) return 0

  const base = Number(item.amount || item.baseAmount || 0)
  const k = stepUpK(item, y, m)
  return applyStepUp(base, item.stepUp, k)
}

export function monthlyTotals(items, y) {
  const totals = Array.from({ length: 12 }, () => 0)
  items.forEach((it) => {
    for (let m = 0; m < 12; m++) {
      totals[m] += amountForItemInMonth(it, y, m)
    }
  })
  return totals
}

export function monthlyTotalsByType(items, y, type) {
  const totals = Array.from({ length: 12 }, () => 0)
  items.forEach((it) => {
    if (it.type !== type) return
    for (let m = 0; m < 12; m++) {
      totals[m] += amountForItemInMonth(it, y, m)
    }
  })
  return totals
}

export function amountForMonth(items, y, m, filterType) {
  return items.reduce((sum, it) => {
    if (filterType && it.type !== filterType) return sum
    return sum + amountForItemInMonth(it, y, m)
  }, 0)
}

export function nextDueDate(item, fromDate = new Date()) {
  const start = parseDate(item.startDate)
  if (!start) return null
  const end = item.endDate ? parseDate(item.endDate) : null
  const y0 = fromDate.getFullYear()
  const m0 = fromDate.getMonth()

  if (item.recurrence === 'one-time') {
    return start >= monthStart(y0, m0) ? start : null
  }

  const period = PERIOD_MONTHS[item.recurrence]
  if (!period) return null

  // advance month by month until we hit an occurrence or pass end
  let y = y0, m = m0
  for (let i = 0; i < 60; i++) { // search up to 5 years
    if (occursInMonth(item, y, m) && inRangeMonth(item, y, m)) {
      return new Date(y, m, start.getDate())
    }
    m++
    if (m > 11) { m = 0; y++ }
    if (end && monthStart(y, m) > end) break
  }
  return null
}
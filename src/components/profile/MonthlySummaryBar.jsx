
// src/components/profile/MonthlySummaryBar.jsx
import { amountForMonth } from './utils/recurrence'

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MonthlySummaryBar({ items }) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const thisMonthTotal = amountForMonth(items, y, m)
  const thisMonthEMI = amountForMonth(items, y, m, 'EMI')
  const thisMonthSIP = amountForMonth(items, y, m, 'SIP')

  const next6 = []
  for (let i = 0; i < 6; i++) {
    const mm = (m + i) % 12
    const yy = y + Math.floor((m + i) / 12)
    next6.push({
      label: `${monthNames[mm]} ${String(yy).slice(-2)}`,
      amount: amountForMonth(items, yy, mm),
    })
  }

  return (
    <div className="monthly-summary">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-title">This Month · Total</div>
          <div className="summary-value">₹ {thisMonthTotal.toLocaleString('en-IN')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">EMI</div>
          <div className="summary-value">₹ {thisMonthEMI.toLocaleString('en-IN')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">SIP</div>
          <div className="summary-value">₹ {thisMonthSIP.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="month-pills" aria-label="Next 6 months">
        {next6.map((m) => (
          <div key={m.label} className="pill">
            <span className="pill-label">{m.label}</span>
            <span className="pill-amount">₹ {m.amount.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
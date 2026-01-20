
// src/components/profile/RecurringItemEditor.jsx
import { useEffect, useMemo, useState } from 'react'

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
]

const TYPE_OPTIONS = [
  { value: 'EMI', label: 'EMI' },
  { value: 'SIP', label: 'SIP' },
  { value: 'Fixed', label: 'Fixed Expense' },
]

export default function RecurringItemEditor({ onSubmit, editItem }) {
  const [form, setForm] = useState({
    id: '',
    type: 'EMI',
    label: '',
    amount: '',
    recurrence: 'monthly',
    startDate: '',
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (editItem) setForm(editItem)
  }, [editItem])

  const canSubmit = useMemo(() => {
    const amountValid = Number(form.amount) > 0
    return form.type && form.label.trim() && amountValid && form.recurrence
  }, [form])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    const id = form.id || `rec_${Date.now()}`
    onSubmit?.({ ...form, id, amount: Number(form.amount) })
    if (!editItem) {
      setForm({
        id: '',
        type: 'EMI',
        label: '',
        amount: '',
        recurrence: 'monthly',
        startDate: '',
      })
    }
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  return (
    <form className="recurring-editor" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="ri-type">Type</label>
          <select
            id="ri-type"
            value={form.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="ri-label">Label</label>
          <input
            id="ri-label"
            type="text"
            placeholder="e.g., Home Loan / Internet / SIP-Bluechip"
            value={form.label}
            onChange={(e) => update({ label: e.target.value })}
          />
        </div>

        <div className="form-row">
          <label htmlFor="ri-amount">Amount</label>
          <input
            id="ri-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => update({ amount: e.target.value })}
          />
        </div>

        <div className="form-row">
          <label htmlFor="ri-recurrence">Recurrence</label>
          <select
            id="ri-recurrence"
            value={form.recurrence}
            onChange={(e) => update({ recurrence: e.target.value })}
          >
            {RECURRENCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="ri-startDate">Start Date</label>
          <input
            id="ri-startDate"
            type="date"
            value={form.startDate || ''}
            onChange={(e) => update({ startDate: e.target.value })}
          />
        </div>
      </div>

      <div className="actions-right">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {editItem ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  )
}

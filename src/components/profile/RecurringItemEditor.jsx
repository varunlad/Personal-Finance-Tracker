
// src/components/profile/RecurringItemEditor.jsx
import { useEffect, useMemo, useState } from 'react'

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time (Lump sum)' },
]

const TYPE_OPTIONS = [
  { value: 'EMI', label: 'EMI' },
  { value: 'SIP', label: 'SIP' },
  { value: 'Fixed', label: 'Fixed Expense' },
]

export default function RecurringItemEditor({ onSubmit, editItem }) {
  const [form, setForm] = useState({
    id: '',
    type: 'SIP',
    label: '',
    amount: '',
    recurrence: 'monthly',
    startDate: '',
    endDate: '', // stop SIP
    stepUp: {
      enabled: false,
      mode: 'amount',     // 'amount' | 'percent'
      every: '12m',       // '6m' | '12m'
      value: '',          // number
      from: '',           // default startDate
    },
  })

  useEffect(() => {
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        stepUp: { enabled: false, mode: 'amount', every: '12m', value: '', from: '' },
        ...editItem,
        // eslint-disable-next-line no-dupe-keys
        stepUp: {
          enabled: editItem?.stepUp?.enabled || false,
          mode: editItem?.stepUp?.mode || 'amount',
          every: editItem?.stepUp?.every || '12m',
          value: editItem?.stepUp?.value ?? '',
          from: editItem?.stepUp?.from || '',
        },
      })
    }
  }, [editItem])

  const canSubmit = useMemo(() => {
    const amt = Number(form.amount)
    const hasBase = form.type && form.label.trim() && amt > 0
    const hasStart = !!form.startDate || form.recurrence === 'one-time'
    return hasBase && hasStart
  }, [form])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))
  const updateStep = (patch) => setForm((f) => ({ ...f, stepUp: { ...f.stepUp, ...patch } }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    const id = form.id || `rec_${Date.now()}`
    const normalized = {
      ...form,
      id,
      amount: Number(form.amount),
      stepUp: {
        ...form.stepUp,
        value: form.stepUp.enabled ? Number(form.stepUp.value || 0) : 0,
        from: form.stepUp.enabled ? (form.stepUp.from || form.startDate) : '',
      },
      endDate: form.endDate || '',
    }
    onSubmit?.(normalized)
    if (!editItem) {
      setForm({
        id: '',
        type: 'SIP',
        label: '',
        amount: '',
        recurrence: 'monthly',
        startDate: '',
        endDate: '',
        stepUp: { enabled: false, mode: 'amount', every: '12m', value: '', from: '' },
      })
    }
  }

  const showEndDate = form.type === 'SIP' && form.recurrence !== 'one-time'
  const showStepUp = form.type === 'SIP' && form.recurrence !== 'one-time'

  return (
    <form className="recurring-editor" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="ri-type">Type</label>
          <select id="ri-type" value={form.type} onChange={(e) => update({ type: e.target.value })}>
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
            placeholder="e.g., LIC / Home Loan / SIP-Bluechip"
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
            step="1"
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
          <label htmlFor="ri-startDate">
            {form.recurrence === 'one-time' ? 'Date' : 'Start Date'}
          </label>
          <input
            id="ri-startDate"
            type="date"
            value={form.startDate || ''}
            onChange={(e) => update({ startDate: e.target.value })}
          />
          {form.recurrence !== 'one-time' && (
            <span style={{fontSize:10}} className="muted">Anchor month/day is taken from this date.</span>
          )}
        </div>

        {showEndDate && (
          <div className="form-row">
            <label htmlFor="ri-endDate">End Date (stop)</label>
            <input
              id="ri-endDate"
              type="date"
              value={form.endDate || ''}
              onChange={(e) => update({ endDate: e.target.value })}
            />
          </div>
        )}
      </div>

      {showStepUp && (
        <div className="stepup-row" style={{marginTop:10}}>
          <label className="stepup-toggle">
            <input
              type="checkbox"
              checked={form.stepUp.enabled}
              onChange={(e) => updateStep({ enabled: e.target.checked })}
              style={{width:16, height:16, margin:8}}
            />
            <span style={{fontSize:14, marginBottom:8}}>Enable SIP Step-up</span>
          </label>

          {form.stepUp.enabled && (
            <div className="stepup-grid">
              <div className="form-row">
                <label htmlFor="su-mode">Mode</label>
                <select
                  id="su-mode"
                  value={form.stepUp.mode}
                  onChange={(e) => updateStep({ mode: e.target.value })}
                >
                  <option value="amount">Amount</option>
                  <option value="percent">Percent</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="su-every">Every</label>
                <select
                  id="su-every"
                  value={form.stepUp.every}
                  onChange={(e) => updateStep({ every: e.target.value })}
                >
                  <option value="6m">6 months</option>
                  <option value="12m">1 year</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="su-value">
                  {form.stepUp.mode === 'amount' ? 'Amount (₹)' : 'Percent (%)'}
                </label>
                <input
                  id="su-value"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stepUp.value}
                  onChange={(e) => updateStep({ value: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label htmlFor="su-from">From (optional)</label>
                <input
                  id="su-from"
                  type="date"
                  value={form.stepUp.from || ''}
                  onChange={(e) => updateStep({ from: e.target.value })}
                />
                <span className="muted">Default: Start Date</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="actions-right" style={{marginTop:15}}>
        <button type="submit" style={{backgroundColor:'#3b82f6'}} className="btn" disabled={!canSubmit}>
          {editItem ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  )
}

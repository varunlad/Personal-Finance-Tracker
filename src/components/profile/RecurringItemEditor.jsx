// src/components/profile/RecurringItemEditor.jsx
import { useEffect, useMemo, useState, useId } from 'react'

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

// --- helpers for dates ---
function todayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function clampToToday(ymd) {
  if (!ymd) return ''
  const t = todayYMD()
  return ymd > t ? t : ymd
}

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
      value: '',          // number (as string in form)
      from: '',           // default startDate
    },
  })

  // unique id prefix for this component instance
  const uid = useId()
  const fid = (name) => `${uid}-${name}`

  // Always compute "today" once per render
  const TODAY = todayYMD()

  useEffect(() => {
    if (editItem) {
      // Merge edit item; do not auto-change existing future dates here,
      // but any user change will clamp via onChange handlers below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({
        ...prev,
        ...editItem,
        stepUp: {
          enabled: editItem?.stepUp?.enabled ?? false,
          mode: editItem?.stepUp?.mode ?? 'amount',
          every: editItem?.stepUp?.every ?? '12m',
          value: editItem?.stepUp?.value ?? '',
          from: editItem?.stepUp?.from ?? '',
        },
      }))
    }
  }, [editItem])

  const canSubmit = useMemo(() => {
    const amt = Number(form.amount)
    const hasBase = form.type && form.label.trim() && amt > 0
    const hasStart = !!form.startDate || form.recurrence === 'one-time'
    // extra guard: no future dates allowed
    const noFutureDates =
      (!form.startDate || form.startDate <= TODAY) &&
      (!form.endDate || form.endDate <= TODAY) &&
      (!form.stepUp?.from || form.stepUp.from <= TODAY)

    return hasBase && hasStart && noFutureDates
  }, [form, TODAY])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))
  const updateStep = (patch) =>
    setForm((f) => ({ ...f, stepUp: { ...f.stepUp, ...patch } }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return

    const id = form.id || `rec_${Date.now()}`
    const normalized = {
      ...form,
      id,
      // clamp any date fields one last time for safety
      startDate: clampToToday(form.startDate),
      endDate: clampToToday(form.endDate || ''),
      amount: Number(form.amount),
      stepUp: {
        ...form.stepUp,
        value: form.stepUp.enabled ? Number(form.stepUp.value || 0) : 0,
        from: form.stepUp.enabled
          ? clampToToday(form.stepUp.from || form.startDate)
          : '',
      },
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
          <label htmlFor={fid('type')}>Type</label>
          <select
            id={fid('type')}
            value={form.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor={fid('label')}>Label</label>
          <input
            id={fid('label')}
            type="text"
            placeholder="e.g., LIC / Home Loan / SIP-Bluechip"
            value={form.label}
            onChange={(e) => update({ label: e.target.value })}
          />
        </div>

        <div className="form-row">
          <label htmlFor={fid('amount')}>Amount</label>
          <input
            id={fid('amount')}
            type="number"
            min="0"
            step="1"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => update({ amount: e.target.value })}
          />
        </div>

        <div className="form-row">
          <label htmlFor={fid('recurrence')}>Recurrence</label>
          <select
            id={fid('recurrence')}
            value={form.recurrence}
            onChange={(e) => update({ recurrence: e.target.value })}
          >
            {RECURRENCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor={fid('startDate')}>
            {form.recurrence === 'one-time' ? 'Date' : 'Start Date'}
          </label>
          <input
            id={fid('startDate')}
            type="date"
            max={TODAY}
            value={form.startDate || ''}
            onChange={(e) => update({ startDate: clampToToday(e.target.value) })}
          />
          {form.recurrence !== 'one-time' && (
            <span style={{fontSize:10}} className="muted">
              Anchor month/day is taken from this date.
            </span>
          )}
        </div>

        {showEndDate && (
          <div className="form-row">
            <label htmlFor={fid('endDate')}>End Date (stop)</label>
            <input
              id={fid('endDate')}
              type="date"
              max={TODAY}
              value={form.endDate || ''}
              onChange={(e) => update({ endDate: clampToToday(e.target.value) })}
            />
          </div>
        )}
      </div>

      {showStepUp && (
        <div className="stepup-row" style={{marginTop:10}}>
          <label className="stepup-toggle" htmlFor={fid('stepup-enabled')}>
            <input
              id={fid('stepup-enabled')}
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
                <label htmlFor={fid('su-mode')}>Mode</label>
                <select
                  id={fid('su-mode')}
                  value={form.stepUp.mode}
                  onChange={(e) => updateStep({ mode: e.target.value })}
                >
                  <option value="amount">Amount</option>
                  <option value="percent">Percent</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor={fid('su-every')}>Every</label>
                <select
                  id={fid('su-every')}
                  value={form.stepUp.every}
                  onChange={(e) => updateStep({ every: e.target.value })}
                >
                  <option value="6m">6 months</option>
                  <option value="12m">1 year</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor={fid('su-value')}>
                  {form.stepUp.mode === 'amount' ? 'Amount (₹)' : 'Percent (%)'}
                </label>
                <input
                  id={fid('su-value')}
                  type="number"
                  min="0"
                  step="1"
                  value={form.stepUp.value}
                  onChange={(e) => updateStep({ value: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label htmlFor={fid('su-from')}>From (optional)</label>
                <input
                  id={fid('su-from')}
                  type="date"
                  max={TODAY}
                  value={form.stepUp.from || ''}
                  onChange={(e) => updateStep({ from: clampToToday(e.target.value) })}
                />
                <span className="muted">Default: Start Date</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="actions-right" style={{marginTop:15}}>
        <button
          type="submit"
          style={{backgroundColor:'#583889'}}
          className="btn"
          disabled={!canSubmit}
          id={fid('submit')}
        >
          {editItem ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  )
}

// src/components/profile/RecurringItemList.jsx
import { useMemo, useState } from 'react'
import RecurringItemEditor from './RecurringItemEditor'
import { nextDueDate } from './utils/recurrence'

const labelOf = (rec) => {
  switch (rec) {
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'half-yearly': return 'Half-yearly'
    case 'yearly': return 'Yearly'
    case 'one-time': return 'One-time'
    default: return rec
  }
}

export default function RecurringItemList({ items, onDelete, onEdit }) {
  const [editing, setEditing] = useState(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = new Date()

  const withMeta = useMemo(() => {
    return items.map((it) => {
      const nd = nextDueDate(it, today)
      return {
        ...it,
        nextDue: nd ? nd.toISOString().slice(0, 10) : '-',
      }
    })
  }, [items, today])

  return (
    <div className="recurring-list">
      {editing && (
        <div className="edit-inline" style={{ marginBottom: 20 }}>
          <div className="edit-inline__title">Edit: {editing.label}</div>
          <RecurringItemEditor
            editItem={editing}
            onSubmit={(it) => {
              onEdit?.(it)
              setEditing(null)
            }}
          />
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel Edit</button>
        </div>
      )}

      {/* Desktop: table */}
      <div className="table-responsive desktop-only">
        <table className="recurring-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Label</th>
              <th>Amount</th>
              <th>Recurrence</th>
              <th>Start</th>
              <th>End</th>
              <th>Next Due</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {withMeta.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">No items yet.</td>
              </tr>
            ) : (
              withMeta.map((it) => (
                <tr key={it.id}>
                  <td>{it.type}</td>
                  <td>{it.label}</td>
                  <td>₹ {Number(it.amount || 0).toLocaleString('en-IN')}</td>
                  <td>{labelOf(it.recurrence)}</td>
                  <td>{it.startDate || '-'}</td>
                  <td>{it.endDate || '-'}</td>
                  <td>{it.nextDue}</td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => setEditing(it)} aria-label="Edit">✎</button>
                    <button className="icon-btn danger" onClick={() => onDelete?.(it.id)} aria-label="Delete">🗑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="recurring-cards mobile-only">
        {withMeta.length === 0 ? (
          <div className="empty-row">No items yet.</div>
        ) : (
          withMeta.map((it) => (
            <div key={it.id} className="rec-card">
              <div className="rec-card__row">
                <span className={`chip ${it.type === 'SIP' ? 'chip-sip' : it.type === 'EMI' ? 'chip-emi' : 'chip-fixed'}`}>
                  {it.type}
                </span>
                <span className="rec-amount">₹ {Number(it.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="rec-card__label">{it.label}</div>
              <div className="rec-card__meta">
                <span className="pill">{labelOf(it.recurrence)}</span>
                <span className="pill">Start: {it.startDate || '-'}</span>
                {it.endDate ? <span className="pill">End: {it.endDate}</span> : null}
                <span className="pill primary">Next: {it.nextDue}</span>
              </div>
              {it.stepUp?.enabled && (
                <div className="rec-card__meta">
                  <span className="pill">
                    Step-up: {it.stepUp.mode === 'amount' ? `₹${it.stepUp.value}` : `${it.stepUp.value}%`} / {it.stepUp.every === '6m' ? '6m' : '1y'}
                  </span>
                </div>
              )}
              <div className="rec-card__actions">
                <button className="btn-secondary" onClick={() => setEditing(it)}>Edit</button>
                <button className="btn-secondary" onClick={() => onDelete?.(it.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

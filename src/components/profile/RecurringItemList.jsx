
// src/components/profile/RecurringItemList.jsx
import { useState } from 'react'
import RecurringItemEditor from './RecurringItemEditor'

const labelOf = (rec) => {
  switch (rec) {
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'half-yearly': return 'Half-yearly'
    case 'yearly': return 'Yearly'
    default: return rec
  }
}

export default function RecurringItemList({ items, onDelete, onEdit, totalByType }) {
  const [editing, setEditing] = useState(null)

  return (
    <div className="recurring-list">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-title">EMIs</div>
          <div className="summary-value">₹ {totalByType.EMI?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">SIPs</div>
          <div className="summary-value">₹ {totalByType.SIP?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Fixed</div>
          <div className="summary-value">₹ {totalByType.Fixed?.toLocaleString('en-IN') || 0}</div>
        </div>
      </div>

      {editing && (
        <div className="edit-inline">
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

      <div className="table-responsive">
        <table className="recurring-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Label</th>
              <th>Amount</th>
              <th>Recurrence</th>
              <th>Start</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">No recurring items yet.</td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td>{it.type}</td>
                  <td>{it.label}</td>
                  <td>₹ {Number(it.amount || 0).toLocaleString('en-IN')}</td>
                  <td>{labelOf(it.recurrence)}</td>
                  <td>{it.startDate || '-'}</td>
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
    </div>
  )
}

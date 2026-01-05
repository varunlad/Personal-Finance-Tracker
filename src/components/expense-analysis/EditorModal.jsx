
// src/components/expense-analysis/EditorModal.jsx
export default function EditorModal({
  editingDay,
  categoryOptions,
  editRows,
  pendingDeleteIds,
  addRow,
  updateRow,
  toggleDelete,
  saveChanges,
  closeEditor,
  year,
  month,
  canEditDay,
}) {
  if (!editingDay) return null
  const editable = canEditDay(year, month, editingDay)

  // Format: Sat, Dec 20, 2025
  const formattedTitleDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, editingDay))

  return (
    <div
      className="ea-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && closeEditor()}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit entries — ${formattedTitleDate}`}
    >
      <div className="ea-modal">
        <div className="ea-modal-header">
          <div className="ea-modal-title">
            Edit entries — {formattedTitleDate}
          </div>
          <button
            className="ea-close"
            type="button"
            onClick={closeEditor}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="ea-modal-body">
          {!editable && (
            <p className="muted">This is a future date. Editing is disabled.</p>
          )}

          <table className="ea-edit-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ width: 140 }}>Amount</th>
                <th style={{ width: 90 }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {editRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No entries yet. Click “Add row”.
                  </td>
                </tr>
              )}

              {editRows.map((r) => {
                const flagged = pendingDeleteIds.has(r.id)
                return (
                  <tr key={r.id} className={flagged ? 'ea-row-deleted' : ''}>
                    <td>
                      <select
                        value={r.category}
                        onChange={(e) =>
                          editable && updateRow(r.id, { category: e.target.value })
                        }
                        disabled={!editable}
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={r.amount}
                        onChange={(e) =>
                          editable && updateRow(r.id, { amount: e.target.value })
                        }
                        disabled={!editable}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`ea-del-btn ${flagged ? 'is-active' : ''}`}
                        onClick={() => editable && toggleDelete(r.id)}
                        disabled={!editable}
                        title={flagged ? 'Restore' : 'Mark for delete'}
                      >
                        {flagged ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="ea-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={editable ? addRow : undefined}
              disabled={!editable}
            >
              Add row
            </button>
            <div className="spacer" />
            <button type="button" className="btn-secondary" onClick={closeEditor}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={editable ? saveChanges : undefined}
              disabled={!editable}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



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
  if (!editingDay) return null;
  const editable = canEditDay(year, month, editingDay);

  // Format: Sat, Dec 20, 2025
  const formattedTitleDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, editingDay));

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
          <div className="ea-modal-title">Edit entries — {formattedTitleDate}</div>
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
                {/* ✅ Note column */}
                <th>Note (optional)</th>
                <th style={{ width: 120 }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {editRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No expense yet. Click 'Add row'.
                  </td>
                </tr>
              )}

              {editRows.map((r) => {
                const flagged = pendingDeleteIds.has(r.id);
                return (
                  <tr key={r.id} className={flagged ? "ea-row-deleted" : ""}>
                    <td>
                      <div className="ea-select-wrap">
                        <select
                          value={r.category}
                          onChange={(e) =>
                            editable && updateRow(r.id, { category: e.target.value })
                          }
                          disabled={!editable}
                          className="ea-category-select"
                        >
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        // ✅ show empty string when cleared (fix for 0 sticking)
                        value={r.amount === "" ? "" : r.amount}
                        onChange={(e) => {
                          if (!editable) return;
                          const raw = e.target.value;
                          // Allow empty during typing; cast to number later in save pipeline
                          if (raw === "") {
                            updateRow(r.id, { amount: "" });
                          } else {
                            const n = Number(raw);
                            updateRow(r.id, { amount: Number.isFinite(n) && n >= 0 ? n : 0 });
                          }
                        }}
                        disabled={!editable}
                        aria-label="Amount"
                      />
                    </td>
                    {/* ✅ Note input keeps compact on mobile */}
                    <td>
                      <input
                        type="text"
                        maxLength={200}
                        placeholder="Add a short note…"
                        value={r.note || ""}
                        onChange={(e) =>
                          editable &&
                          updateRow(r.id, { note: String(e.target.value).slice(0, 200) })
                        }
                        disabled={!editable}
                        aria-label="Note"
                        className="ea-note-input"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`ea-del-btn ${flagged ? "is-active" : ""}`}
                        onClick={() => editable && toggleDelete(r.id)}
                        disabled={!editable}
                        title={flagged ? "Restore" : "Mark for delete"}
                      >
                        {/* {flagged ? "Restore" : "Delete"} */}
                        {flagged ? '↺' :  '🗑️'}
                      </button>
                    </td>
                  </tr>
                );
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
  );
}

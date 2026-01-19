
export default function DayTable({
  year,
  month,
  monthDays,
  totalsByDayInMonth,
  emptyCats,
  fmtAmount,
  pad2,
  canEditDay,
  onOpenEditor,
}) {
  return (
    <div className="ea-table-wrap">
      <table className="ea-table">
        <thead>
          <tr>
            <th className="ea-sticky-day">Day</th>
            <th>Total</th>

            {/* NEW: Credit Card & EMIs */}
            <th>Credit Card</th>
            <th>EMIs</th>

            <th>Mutual Fund</th>
            <th>Stocks</th>
            <th>Shopping</th>
            <th>Grocery</th>
            <th>Rent/Bills</th>
            <th>Other</th>

            <th className="ea-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: monthDays }, (_, i) => i + 1).map((d) => {
            const rec =
              totalsByDayInMonth.get(d) || {
                total: 0,
                categories: { ...emptyCats },
              };
            const hasAny = rec.total > 0;
            const editable = canEditDay(year, month, d);

            return (
              <tr key={d} className={!editable ? "ea-row-future" : ""}>
                <td className="ea-sticky-day">{pad2(d)}</td>
                <td>{fmtAmount(rec.total)}</td>

                {/* NEW: Credit Card & EMIs totals per day */}
                <td>{fmtAmount(rec.categories.creditCard)}</td>
                <td>{fmtAmount(rec.categories.emi)}</td>

                <td>{fmtAmount(rec.categories.mutualFund)}</td>
                <td>{fmtAmount(rec.categories.stock)}</td>
                <td>{fmtAmount(rec.categories.shopping)}</td>
                <td>{fmtAmount(rec.categories.grocery)}</td>
                <td>{fmtAmount(rec.categories.rentBills)}</td>
                <td>{fmtAmount(rec.categories.other)}</td>

                <td>
                  <button
                    type="button"
                    className={`ea-edit-btn ${hasAny ? "" : "ea-edit-btn--ghost"}`}
                    onClick={() => editable && onOpenEditor(d)}
                    disabled={!editable}
                    aria-disabled={!editable}
                    title={
                      editable
                        ? hasAny
                          ? "Edit day entries"
                          : "Add day entries"
                        : "Future date—editing disabled"
                    }
                  >
                    {hasAny ? "Edit" : "Add"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
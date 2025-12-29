// src/components/expense-analysis/HeaderControls.jsx
export default function HeaderControls({
  year,
  month,
  expenses,
  setYear,
  setMonth,
  parseYMD,
}) {
  const years = Array.from(
    new Set(expenses.map((e) => parseYMD(e.date).y))
  ).sort((a, b) => a - b);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="ea-header">
      <div className="ea-title">
        <h3>Expense Analysis</h3>
      </div>
      <div className="ea-controls">
        <label className="ea-control">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.length === 0 && <option value={year}>{year}</option>}
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="ea-control">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {new Intl.DateTimeFormat("en", { month: "short" }).format(
                  new Date(year, m - 1, 1)
                )}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

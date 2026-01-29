// src/components/expense-analysis/HeaderControls.jsx
export default function HeaderControls({
  year,
  month,
  expenses,
  parseYMD,
  onChangeYM, // (y, m) => void
}) {
  const MIN_YEAR = 2025;

  // Collect all years present in data
  const dataYears = Array.from(
    new Set(expenses.map((e) => parseYMD(e.date).y))
  ).sort((a, b) => a - b);

  const currentYear = new Date().getFullYear();

  // Build the final set of years:
  // - at least from 2025
  // - include current year
  // - include the currently selected year (so the dropdown always shows it)
  let yearsSet = new Set([...dataYears, currentYear, year]);

  // Filter out anything before 2025 and sort ascending
  const years = Array.from(yearsSet)
    .filter((y) => y >= MIN_YEAR)
    .sort((a, b) => a - b);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // If the user selects a year earlier than MIN_YEAR from anywhere else in the app,
  // clamp it here as well (defensive). This keeps UI consistent.
  const handleYearChange = (e) => {
    const nextYear = Math.max(MIN_YEAR, Number(e.target.value));
    onChangeYM?.(nextYear, month);
  };

  const handleMonthChange = (e) => {
    onChangeYM?.(year, Number(e.target.value));
  };

  return (
    <div className="ea-header">
      <div className="ea-title">
        <h3>Expense Analysis</h3>
      </div>
      <div className="ea-controls">
        <label className="ea-control">
          <select value={year} onChange={handleYearChange}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="ea-control">
          <select value={month} onChange={handleMonthChange}>
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
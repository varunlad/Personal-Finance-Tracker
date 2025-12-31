import { useState } from "react";
import MonthlyExpenseCalendar from "../monthly/MonthlyExpenseCalendar";
import ExpenseAnalysis from "../expense-analysis/ExpenseAnalysis";

/**
 * Option B shape: grouped by day
 * Each item MUST have a stable `id` coming from backend for reliable edits/deletes.
 */
const groupedExpensesSeed = [
  {
    date: "2025-12-01",
    items: [
      { id: "e1", amount: 200, category: "mutualFund" },
      { id: "e2", amount: 150, category: "shopping" },
      { id: "e3", amount: 80, category: "grocery" },
    ],
    // total is optional; UI will recompute if missing
    // total: 430,
  },
  {
    date: "2025-12-05",
    items: [
      { id: "e4", amount: 400, category: "stock" },
      { id: "e5", amount: 120, category: "other" },
    ],
    // total: 520,
  },
  {
    date: "2025-12-20",
    items: [{ id: "e6", amount: 1250, category: "mutualFund" }],
    // total: 1250,
  },
];

export default function DailyExpensesPage() {
  // Lock to December 2025 to match your example
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(12);

  // Keep grouped day data in state so edits from ExpenseAnalysis persist.
  const [dayGroups, setDayGroups] = useState(groupedExpensesSeed);

  const handleChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  // Receive updates from ExpenseAnalysis and persist in local state.
  function handleUpdateDayGroups(next) {
    // Optional: keep array stably sorted by date for consistent indices per day.
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setDayGroups(sorted);
  }
  console.log("dayGroups", dayGroups);
  return (
    <>
      <MonthlyExpenseCalendar
        year={year}
        month={month}
        onChange={handleChange}
        dayGroups={dayGroups} // <-- grouped state (editable)
        startOnMonday={false}
        currency="RS" // or "INR" for ₹
        minYearMonth={{ year: 2025, month: 1 }}
        maxYearMonth={{ year: 2025, month: 12 }}
      />

      <ExpenseAnalysis
        dayGroups={dayGroups} // <-- same grouped state
        currency="RS"
        initialYear={year}
        initialMonth={month}
        onUpdateDayGroups={handleUpdateDayGroups} // <-- enables editing
      />
    </>
  );
}

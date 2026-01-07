import { useState } from "react";
import MonthlyExpenseCalendar from "../monthly/MonthlyExpenseCalendar";
import ExpenseAnalysis from "../expense-analysis/ExpenseAnalysis";
import ExpenseSummary from "../expense-summary/ExpenseSummary";

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
  },
  {
    date: "2025-12-05",
    items: [
      { id: "e4", amount: 400, category: "stock" },
      { id: "e5", amount: 120, category: "other" },
    ],
  },
  {
    date: "2025-12-20",
    items: [{ id: "e6", amount: 1250, category: "mutualFund" }],
  },
];

export default function DailyExpensesPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [dayGroups, setDayGroups] = useState(groupedExpensesSeed);

  const handleChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  function handleUpdateDayGroups(next) {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setDayGroups(sorted);
  }

  return (
    <>
      <ExpenseSummary dayGroups={dayGroups} />
      <MonthlyExpenseCalendar
        year={year}
        month={month}
        onChange={handleChange}
        dayGroups={dayGroups}
        startOnMonday={false}
        currency="RS"
        minYearMonth={{ year: 2025, month: 1 }}
        maxYearMonth={{
          year: today.getFullYear(),
          month: today.getMonth() + 1,
        }}
      />

      <ExpenseAnalysis
        dayGroups={dayGroups}
        currency="RS"
        initialYear={year}
        initialMonth={month}
        onUpdateDayGroups={handleUpdateDayGroups}
      />
    </>
  );
}

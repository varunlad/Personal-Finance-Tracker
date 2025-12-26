
import { useState } from "react"
import MonthlyExpenseCalendar from "../monthly/MonthlyExpenseCalendar"
import ExpenseAnalysis from "./ExpenseAnalysis"

/**
 * Helper to flatten mixed shapes:
 *  - Grouped: { date, items: [{ amount, category }, ...] }
 *  - Flat:    { date, amount, category }
 */
function toFlatExpenses(list) {
  if (!Array.isArray(list)) return []
  const flat = []
  for (const e of list) {
    if (e && Array.isArray(e.items)) {
      for (const item of e.items) {
        flat.push({
          date: e.date,
          amount: Number(item.amount) || 0,
          category: item.category || "other",
        })
      }
    } else {
      // already flat
      flat.push({
        date: e.date,
        amount: Number(e.amount) || 0,
        category: e.category || "other",
      })
    }
  }
  return flat
}

export default function DailyExpensesPage() {
  // Lock to December 2025 to match your example
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState(12)

  // --- Grouped data: one object per date with items array ---
  const groupedExpenses = [
    {
      date: "2025-12-01",
      items: [
        { amount: 200, category: "mutualFund" },
        { amount: 150, category: "shopping" },
        { amount: 80, category: "grocery" },
      ],
    },
    {
      date: "2025-12-05",
      items: [
        { amount: 400, category: "stock" },
        { amount: 120, category: "other" },
      ],
    },
    {
      date: "2025-12-20",
      items: [{ amount: 1250, category: "mutualFund" }],
    },
    // Add more days as needed; the system aggregates automatically.
  ]

  // Keep expenses in state so edits from ExpenseAnalysis persist.
  const [expenses, setExpenses] = useState(() =>
    toFlatExpenses(groupedExpenses)
  )

  const handleChange = (y, m) => {
    setYear(y)
    setMonth(m)
  }

  // Receive updates from ExpenseAnalysis and persist in local state.
  function handleUpdateExpenses(next) {
    // Optional: keep array stably sorted by date for consistent indices per day.
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date))
    setExpenses(sorted)
  }

  return (
    <>
      <section className="card">
        <h3>Monthly Expenses</h3>
        <p className="muted">
          Tap a day to see details. Navigate months with arrows.
        </p>
      </section>

      <MonthlyExpenseCalendar
        year={year}
        month={month}
        onChange={handleChange}
        expenses={expenses}      // <-- state array (editable)
        startOnMonday={false}
        currency="RS"            // or "INR" for ₹
        minYearMonth={{ year: 2025, month: 1 }}
        maxYearMonth={{ year: 2025, month: 12 }}
      />

      <ExpenseAnalysis
        expenses={expenses}      // <-- same state array
        currency="RS"
        initialYear={year}
        initialMonth={month}
        onUpdateExpenses={handleUpdateExpenses}  // <-- enables editing
      />
    </>
  )
}

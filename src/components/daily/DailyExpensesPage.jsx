import { useEffect, useState } from "react";
import MonthlyExpenseCalendar from "../monthly/MonthlyExpenseCalendar";
import ExpenseAnalysis from "../expense-analysis/ExpenseAnalysis";
import ExpenseSummary from "../expense-summary/ExpenseSummary";
import { useAuth } from "../../context/auth-context";
import { listMonthExpenses } from "../../api/expenses";
import Loader from "../loader/Loader";

export default function DailyExpensesPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // 🔒 Stable baseline for ExpenseSummary; starts empty and updates on edits/fetch
  const [summaryDayGroups, setSummaryDayGroups] = useState([]);

  // 👁️ Month-scoped view for Calendar & Editor
  const [monthViewGroups, setMonthViewGroups] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();

  const handleChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  // Load current month into monthViewGroups ONLY
  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setLoading(true);
      setError("");
      try {
        if (!token) {
          // If user isn’t logged in yet, show empty month view.
          if (!cancelled) setMonthViewGroups([]);
          return;
        }

        const data = await listMonthExpenses({ month, year, token });
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        if (!cancelled) {
          setMonthViewGroups(sorted);

          // OPTIONAL: Initialize the summary baseline the first time
          if (summaryDayGroups.length === 0) {
            setSummaryDayGroups(sorted); // or keep empty until edits
          }
        }
      } catch (err) {
        if (!cancelled) {
          setMonthViewGroups([]); // show empty state
          setError(err.message || "Failed to load expenses");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMonth();
    return () => {
      cancelled = true;
    };
  }, [month, year, token, summaryDayGroups.length]); // keep deps minimal

  // Merge the edited month back into the summary baseline
  function mergeMonthIntoSummary(editedMonthGroups, editedYear, editedMonth) {
    setSummaryDayGroups((prev) => {
      const filtered = prev.filter((g) => {
        const [y, m] = g.date.split("-").map(Number);
        return !(y === editedYear && m === editedMonth);
      });
      const merged = [...filtered, ...editedMonthGroups];
      merged.sort((a, b) => a.date.localeCompare(b.date));
      return merged;
    });
  }

  // Called by ExpenseAnalysis after local edits (month-scoped)
  function handleUpdateMonthGroups(nextMonthGroups) {
    const sortedMonth = [...nextMonthGroups].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    setMonthViewGroups(sortedMonth);
    mergeMonthIntoSummary(sortedMonth, year, month);
  }

  return (
    <>
      {loading && (
        <div className="card" aria-live="polite">
          <Loader label="Loading month…" />
        </div>
      )}
      {error && (
        <div className="card inline-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <ExpenseSummary
        dayGroups={summaryDayGroups}
        minSelectableDate={new Date(1990, 0, 1)} // optional
      />

      <MonthlyExpenseCalendar
        year={year}
        month={month}
        onChange={handleChange}
        dayGroups={monthViewGroups}
        startOnMonday={false}
        currency="RS"
        minYearMonth={{ year: 2025, month: 1 }}
        maxYearMonth={{
          year: today.getFullYear(),
          month: today.getMonth() + 1,
        }}
      />

      <ExpenseAnalysis
        dayGroups={monthViewGroups}
        currency="RS"
        initialYear={year}
        initialMonth={month}
        onUpdateDayGroups={handleUpdateMonthGroups}
        token={token}
      />
    </>
  );
}

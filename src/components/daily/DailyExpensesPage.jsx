// src/components/daily-expenses/DailyExpensesPage.jsx
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

  const MIN_YEAR = 2025; // 🔒 enforce 2025+
  const MIN_YM = { year: MIN_YEAR, month: 1 };

  // 🔒 Stable baseline for ExpenseSummary; starts empty and updates on edits/fetch
  const [summaryDayGroups, setSummaryDayGroups] = useState([]);

  // 👁️ Month-scoped view for Calendar & Editor
  const [monthViewGroups, setMonthViewGroups] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();

  // Clamp helper: keep YM >= 2025-01
  function clampToMinYM(y, m) {
    if (y < MIN_YM.year) return { y: MIN_YM.year, m: MIN_YM.month };
    if (y === MIN_YM.year && m < MIN_YM.month) return { y, m: MIN_YM.month };
    return { y, m };
  }

  const handleChange = (y, m) => {
    const clamped = clampToMinYM(y, m);
    setYear(clamped.y);
    setMonth(clamped.m);
  };

  // Load current month into monthViewGroups ONLY
  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setLoading(true);
      setError("");
      try {
        if (!token) {
          if (!cancelled) setMonthViewGroups([]);
          return;
        }
        const data = await listMonthExpenses({ month, year, token });
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        if (!cancelled) {
          setMonthViewGroups(sorted);
          if (summaryDayGroups.length === 0) {
            setSummaryDayGroups(sorted);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setMonthViewGroups([]);
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
  }, [month, year, token, summaryDayGroups.length]);

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
        minSelectableDate={new Date(1990, 0, 1)}
      />

      <MonthlyExpenseCalendar
        year={year}
        month={month}
        onChange={handleChange}
        dayGroups={monthViewGroups}
        startOnMonday={false}
        currency="RS"
        minYearMonth={{ year: MIN_YEAR, month: 1 }}
        maxYearMonth={{
          year: today.getFullYear(),
          month: today.getMonth() + 1,
        }}
      />

      <ExpenseAnalysis
        dayGroups={monthViewGroups}
        currency="RS"
        year={year}
        month={month}
        onChangeYM={handleChange}
        onUpdateDayGroups={handleUpdateMonthGroups}
        token={token}
      />
    </>
  );
}

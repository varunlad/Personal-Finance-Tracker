
// src/api/expenses.js
import { request } from './http'

// Month grouped by day (controller: getExpensesByMonthYear)
export function listMonthExpenses({ month, year, token }) {
  return request(`/api/expenses?month=${Number(month)}&year=${Number(year)}`, {
    method: 'GET',
    token,
  })
}

export function listRangeExpenses({ start, end, token }) {
  return request(`/api/expenses/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    method: 'GET',
    token,
  });
}


// Bulk add + return updated month (controller: addExpenseAndGetUpdatedData)
export function addExpensesBulk({ expenses, month, year, token }) {
  return request(`/api/expenses/bulk?month=${Number(month)}&year=${Number(year)}`, {
    method: 'POST',
    body: { expenses },
    token,
  })
}

// Single day details (controller: getDayExpenses)
export function getDayExpenses({ date, token }) {
  return request(`/api/expenses/day/${date}`, {
    method: 'GET',
    token,
  })
}

// Upsert all items for a day (controller: upsertDayExpenses)
export function upsertDayExpenses({ date, items, token }) {
  return request(`/api/expenses/day/${date}`, {
    method: 'PUT',
    body: { items },
    token,
  })
}

// Delete one expense by id (controller: deleteExpense)
export function deleteExpenseById({ id, token }) {
  return request(`/api/expenses/${id}`, {
    method: 'DELETE',
    token,
  })
}

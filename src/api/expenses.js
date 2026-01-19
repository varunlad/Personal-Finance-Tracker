
// src/api/expenses.js
import { request } from "./http";

export function listMonthExpenses({ month, year, token }) {
  return request(`/api/expenses?month=${Number(month)}&year=${Number(year)}`, {
    method: "GET",
    token,
  });
}

export function listRangeExpenses({ start, end, token }) {
  return request(
    `/api/expenses/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {
      method: "GET",
      token,
    }
  );
}

export function addExpensesBulk({ expenses, month, year, token }) {
  return request(`/api/expenses?month=${Number(month)}&year=${Number(year)}`, {
    method: "POST",
    body: { expenses }, // [{ amount, category, date, note? }]
    token,
  });
}

export function getDayExpenses({ date, token }) {
  return request(`/api/expenses/day/${date}`, {
    method: "GET",
    token,
  });
}

export function upsertDayExpenses({ date, items, token }) {
  return request(`/api/expenses/day/${date}`, {
    method: "PUT",
    body: { items }, // [{ amount, category, note? }]
    token,
  });
}

export function deleteExpenseById({ id, token }) {
  return request(`/api/expenses/${id}`, {
    method: "DELETE",
    token,
  });
}

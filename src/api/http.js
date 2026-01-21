// Use a proper base like http://localhost:5000
const BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";

export async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      (isJson && (payload?.message || payload?.error)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export function listRangeExpenses({ start, end, token }) {
  return request(
    `/api/expenses/range?start=${encodeURIComponent(
      start
    )}&end=${encodeURIComponent(end)}`,
    {
      method: "GET",
      token,
    }
  );
}

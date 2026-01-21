import { request } from "./http";

/**
 * GET /api/recurring
 * Returns: [{ id, type, label, amount, recurrence, startDate, endDate, stepUp, ... }]
 */
export const listRecurring = ({ token }) =>
  request("/api/recurring", { token });

/**
 * POST /api/recurring
 * Body: item ({ id, type, label, amount, recurrence, startDate, endDate, stepUp })
 * Returns created document
 */
export const addRecurring = ({ item, token }) =>
  request("/api/recurring", {
    method: "POST",
    token,
    body: item,
  });

/**
 * PUT /api/recurring/:id
 * Body: item (same shape)
 * Returns updated document
 */
export const updateRecurring = ({ id, item, token }) =>
  request(`/api/recurring/${encodeURIComponent(id)}`, {
    method: "PUT",
    token,
    body: item,
  });

/**
 * DELETE /api/recurring/:id
 * Returns 204
 */
export const deleteRecurring = ({ id, token }) =>
  request(`/api/recurring/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
``

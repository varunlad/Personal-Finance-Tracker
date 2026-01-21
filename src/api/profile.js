import { request } from "./http";

/**
 * PATCH /api/profile/password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = ({ currentPassword, newPassword, token }) =>
  request("/api/profile/password", {
    method: "PATCH",
    token,
    body: { currentPassword, newPassword },
  });


// src/components/profile/ChangePasswordForm.jsx
import { useState } from "react";
import { changePassword } from "../../api/profile";
import { useToast } from "../toast/ToastProvider";

function readAuthTokenFromStorage() {
  try { return localStorage.getItem("auth_token") || ""; } catch { return ""; }
}

export default function ChangePasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    show: false,
  });
  const [loading, setLoading] = useState(false);
  const token = readAuthTokenFromStorage();

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    if (!token) {
      toast.error("You are not logged in");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        token,
      });
      toast.success("Password updated");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "", show: false });
    } catch (err) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const inputType = form.show ? "text" : "password";

  return (
    <form className="change-password-form" onSubmit={submit}>
      <div className="form-row">
        <label htmlFor="cp-current">Current Password</label>
        <input
          id="cp-current"
          type={inputType}
          value={form.currentPassword}
          onChange={(e) => update({ currentPassword: e.target.value })}
          autoComplete="current-password"
          placeholder="Current password"
        />
      </div>

      <div className="form-row">
        <label htmlFor="cp-new">New Password</label>
        <input
          id="cp-new"
          type={inputType}
          value={form.newPassword}
          onChange={(e) => update({ newPassword: e.target.value })}
          autoComplete="new-password"
          placeholder="New password (min 8 chars)"
        />
      </div>

      <div className="form-row">
        <label htmlFor="cp-confirm">Confirm New Password</label>
        <input
          id="cp-confirm"
          type={inputType}
          value={form.confirmPassword}
          onChange={(e) => update({ confirmPassword: e.target.value })}
          autoComplete="new-password"
          placeholder="Confirm new password"
        />
      </div>

      <div className="form-row" style={{ display: "flex", flexDirection:'row', alignItems: "center", gap: 8 }}>
        <input
          id="cp-show"
          type="checkbox"
          checked={form.show}
          onChange={(e) => update({ show: e.target.checked })}
          style={{ width: 16, height: 16 }}
        />
        <label htmlFor="cp-show" style={{ userSelect: "none" }}>Show passwords</label>
      </div>

      <div className="actions-right" style={{ marginTop: 10, textAlign: "right" }}>
        <button className="btn" type="submit" disabled={loading} style={{ backgroundColor: "#3b82f6" }}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </div>
    </form>
  );
}

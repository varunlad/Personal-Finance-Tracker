// src/components/profile/Profile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./Profile.css";
import RecurringItemEditor from "./RecurringItemEditor";
import RecurringItemList from "./RecurringItemList";
import { useProfileModal } from "../../context/ProfileModalProvider";
import { amountForMonth } from "./utils/recurrence";
import ChangePasswordForm from "./ChangePasswordForm";
import {
  listRecurring as apiListRecurring,
  addRecurring as apiAddRecurring,
  updateRecurring as apiUpdateRecurring,
  deleteRecurring as apiDeleteRecurring,
} from "../../api/recurring";
import { useToast } from "../toast/ToastProvider";

// --- Helpers: read auth ---
function readAuthUserFromStorage() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return { id: "", name: "", email: "" };
    const parsed = JSON.parse(raw);
    return {
      id: parsed?.id ?? "",
      name: parsed?.name ?? "",
      email: parsed?.email ?? "",
    };
  } catch {
    return { id: "", name: "", email: "" };
  }
}
function readAuthTokenFromStorage() {
  try {
    return localStorage.getItem("auth_token") || "";
  } catch {
    return "";
  }
}

// Deep equality for items
function eqItem(a, b) {
  if (!a || !b) return false;
  const simple =
    a.id === b.id &&
    a.type === b.type &&
    a.label === b.label &&
    Number(a.amount) === Number(b.amount) &&
    a.recurrence === b.recurrence &&
    (a.startDate || "") === (b.startDate || "") &&
    (a.endDate || "") === (b.endDate || "");
  if (!simple) return false;
  const sa = a.stepUp || {};
  const sb = b.stepUp || {};
  return (
    !!sa.enabled === !!sb.enabled &&
    (sa.mode || "") === (sb.mode || "") &&
    (sa.every || "") === (sb.every || "") &&
    Number(sa.value || 0) === Number(sb.value || 0) &&
    (sa.from || "") === (sb.from || "")
  );
}
function normalizeForWire(x) {
  const step = x.stepUp || {};
  return {
    id: String(x.id),
    type: String(x.type),
    label: String(x.label),
    amount: Number(x.amount),
    recurrence: String(x.recurrence),
    startDate: x.startDate || "",
    endDate: x.endDate || "",
    stepUp: {
      enabled: !!step.enabled,
      mode: step.mode || "amount",
      every: step.every || "12m",
      value: Number(step.value || 0),
      from: step.from || "",
    },
  };
}
function isEqualList(a = [], b = []) {
  if (a.length !== b.length) return false;
  const mapB = new Map(b.map((x) => [x.id, x]));
  for (const it of a) {
    const other = mapB.get(it.id);
    if (!other || !eqItem(it, other)) return false;
  }
  return true;
}

export default function Profile() {
  const { isOpen, closeProfile } = useProfileModal();
  const toast = useToast();
  const [user, setUser] = useState(() => readAuthUserFromStorage());
  const [items, setItems] = useState([]);
  const [serverSnapshot, setServerSnapshot] = useState([]); // last known server state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const token = readAuthTokenFromStorage();
  const dialogRef = useRef(null);

  const dirty = useMemo(
    () => !isEqualList(items, serverSnapshot),
    [items, serverSnapshot]
  );

  // Rehydrate user
  useEffect(() => {
    if (!isOpen) return;
    setUser(readAuthUserFromStorage());
  }, [isOpen]);

  // Load recurring from backend when modal opens; fallback to localStorage
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!token) throw new Error("No auth token");
        const serverItems = await apiListRecurring({ token });
        if (!cancelled) {
          setItems(serverItems || []);
          setServerSnapshot(serverItems || []);
          try {
            localStorage.setItem(
              "profile_recurring",
              JSON.stringify(serverItems || [])
            );
          } catch { /* empty */ }
        }
      } catch (err) {
        console.warn(
          "Load recurring failed, using localStorage fallback:",
          err
        );
        try {
          const raw = localStorage.getItem("profile_recurring");
          const local = raw ? JSON.parse(raw) : [];
          setItems(local);
          setServerSnapshot(local); // Treat local as snapshot if offline
        } catch {
          setItems([]);
          setServerSnapshot([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token]);

  // Close guard: require Sync if dirty
  const onClose = () => {
    if (dirty) {
      toast.error(
        "You have unsynced changes. Please click “Sync Changes” to save."
      );
      return;
    }
    closeProfile();
  };

  // Local-only add/update (no auto-save to server)
  const handleAddOrUpdate = (newItem) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.id === newItem.id);
      const next = exists
        ? prev.map((it) => (it.id === newItem.id ? newItem : it))
        : [...prev, newItem];
      try {
        localStorage.setItem("profile_recurring", JSON.stringify(next));
      } catch { /* empty */ }
      toast.info(exists ? "Updated (not synced)" : "Added (not synced)");
      return next;
    });
  };

  // Local-only delete (no auto-save to server)
  const handleDelete = (id) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      try {
        localStorage.setItem("profile_recurring", JSON.stringify(next));
      } catch { /* empty */ }
      toast.info("Deleted (not synced)");
      return next;
    });
  };

  // --- Monthly summary ---
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const thisMonthTotal = useMemo(
    () => amountForMonth(items, year, month),
    [items, year, month]
  );
  const thisMonthEMI = useMemo(
    () => amountForMonth(items, year, month, "EMI"),
    [items, year, month]
  );
  const thisMonthSIP = useMemo(
    () => amountForMonth(items, year, month, "SIP"),
    [items, year, month]
  );

  const next6 = useMemo(() => {
    const names = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const mm = (month + i) % 12;
      const yy = year + Math.floor((month + i) / 12);
      arr.push({
        label: `${names[mm]} ${String(yy).slice(-2)}`,
        amount: amountForMonth(items, yy, mm),
      });
    }
    return arr;
  }, [items, year, month]);

  // --- Sync Changes: diff local vs server, apply, refetch, set snapshot ---
  const syncNow = async () => {
    if (!token) {
      toast.error("You are not logged in");
      return;
    }
    setSyncing(true);
    try {
      // Get current server state first (multi-device safe)
      const server = await apiListRecurring({ token });
      const serverById = new Map(server.map((x) => [x.id, x]));
      const localById = new Map(items.map((x) => [x.id, x]));

      const toCreate = [],
        toUpdate = [],
        toDelete = [];

      for (const [id, l] of localById) {
        const s = serverById.get(id);
        if (!s) toCreate.push(normalizeForWire(l));
        else if (!eqItem(l, s)) toUpdate.push(normalizeForWire(l));
      }
      for (const [id] of serverById) {
        if (!localById.has(id)) toDelete.push(id);
      }

      for (const doc of toCreate) await apiAddRecurring({ item: doc, token });
      for (const doc of toUpdate)
        await apiUpdateRecurring({ id: doc.id, item: doc, token });
      for (const id of toDelete) await apiDeleteRecurring({ id, token });

      const refreshed = await apiListRecurring({ token });
      setItems(refreshed || []);
      setServerSnapshot(refreshed || []);
      try {
        localStorage.setItem(
          "profile_recurring",
          JSON.stringify(refreshed || [])
        );
      } catch { /* empty */ }

      toast.success("Changes synced");
    } catch (err) {
      console.error("syncNow failed:", err);
      toast.error(err?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="profile-modal-overlay modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profileModalTitle"
    >
      <div className="profile-modal modal-panel" ref={dialogRef}>
        <header className="profile-modal__header">
          <h2 id="profileModalTitle">Profile</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <section className="profile-modal__content">
          {/* Compact user row */}
          <div className="compact-user-row">
            <div className="compact-user-grid">
              <div className="form-row">
                <label htmlFor="ud-name">Name</label>
                <input
                  readOnly
                  id="ud-name"
                  type="text"
                  placeholder="Your name"
                  value={user.name || ""}
                  autoComplete="name"
                />
              </div>

              <div className="form-row">
                <label htmlFor="ud-email">Email</label>
                <input
                  readOnly
                  id="ud-email"
                  type="email"
                  placeholder="you@example.com"
                  value={user.email || ""}
                  autoComplete="email"
                />
              </div>

              {loading ? (
                <div className="muted" style={{ alignSelf: "end" }}>
                  Loading recurring…
                </div>
              ) : null}
            </div>
          </div>

          {/* Monthly summary */}
          <div className="monthly-summary">
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-title">This Month · Total</div>
                <div className="summary-value">
                  ₹ {thisMonthTotal.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-title">EMI Due</div>
                <div className="summary-value">
                  ₹ {thisMonthEMI.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-title">SIP Due</div>
                <div className="summary-value">
                  ₹ {thisMonthSIP.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="month-pills" aria-label="Next 6 months">
              {next6.map((m) => (
                <div key={m.label} className="pill">
                  <span className="pill-label">{m.label}</span>
                  <span className="pill-amount">
                    ₹ {m.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Editor + List */}
          <div className="recurring-editor">
            <RecurringItemEditor onSubmit={handleAddOrUpdate} />
          </div>

          <RecurringItemList
            items={items}
            onDelete={handleDelete}
            onEdit={handleAddOrUpdate}
          />

          {/* Change Password mini-form */}
          <div
            className="card"
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <ChangePasswordForm />
          </div>
        </section>

        <footer className="profile-modal__footer">
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={syncing}
            >
              Close
            </button>
            <button
              type="button"
              className="btn"
              onClick={syncNow}
              disabled={!dirty || syncing || loading}
              style={{ backgroundColor: dirty ? "#10b981" : "#9ca3af" }}
              title={
                dirty ? "Sync your changes to the server" : "No changes to sync"
              }
            >
              {syncing ? "Syncing…" : "Sync Changes"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

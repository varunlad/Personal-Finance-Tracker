// src/components/profile/Profile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./Profile.css";
import RecurringItemEditor from "./RecurringItemEditor";
import RecurringItemList from "./RecurringItemList";
import { useProfileModal } from "../../context/ProfileModalProvider";
import { amountForMonth } from "./utils/recurrence";

// --- Helpers: read/write auth_user from localStorage ---
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

export default function Profile() {
  const { isOpen, closeProfile } = useProfileModal();

  // Compact view: user details + recurring in one section
  const [user, setUser] = useState(() => readAuthUserFromStorage());
  const [items, setItems] = useState([]); // you can hydrate from localStorage if needed (shown below)
  const dialogRef = useRef(null);

  // Rehydrate user (and optional items) when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readAuthUserFromStorage());

    // Optional: hydrate recurring from localStorage (uncomment if you want)
    try {
      const raw = localStorage.getItem("profile_recurring");
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeProfile();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeProfile]);

  // Lock background scroll, avoid layout shift, and prevent touch scroll behind modal
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    // Compute scrollbar width to avoid layout shift when hiding overflow
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    // Prevent touch scroll behind modal (iOS & Android)
    const preventTouchScroll = (e) => {
      const backdrop = document.querySelector(".modal-backdrop");
      const panel = document.querySelector(".modal-panel");
      if (!backdrop || !panel) return;
      if (!panel.contains(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [isOpen]);

  // Add or update a recurring item
  const handleAddOrUpdate = (newItem) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.id === newItem.id);
      if (exists) {
        return prev.map((it) => (it.id === newItem.id ? newItem : it));
      }
      return [...prev, newItem];
    });
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // --- Monthly summary (accurate due amounts based on recurrence) ---
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

  // Save: persist user + items (frontend only for now)
  //   const handleSaveAll = async () => {
  //     try {
  //       const existing = readAuthUserFromStorage()
  //       const nextUser = {
  //         ...existing,
  //         name: user.name?.trim() || '',
  //         email: user.email?.trim() || '',
  //       }
  //       localStorage.setItem('auth_user', JSON.stringify(nextUser))
  //     } catch (err) {
  //       console.error('Failed to save auth_user:', err)
  //     }

  //     try {
  //       localStorage.setItem('profile_recurring', JSON.stringify(items))
  //     } catch (err) {
  //       console.error('Failed to save recurring items:', err)
  //     }

  //     closeProfile()
  //   }

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
            onClick={closeProfile}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* One compact section */}
        <section className="profile-modal__content">
          {/* Compact user row */}
          <div className="compact-user-row">
            <div className="compact-user-grid">
              <div className="form-row">
                <label htmlFor="ud-name">Name</label>
                <input
                  readOnly={true}
                  id="ud-name"
                  type="text"
                  placeholder="Your name"
                  value={user.name || ""}
                  onChange={(e) =>
                    setUser((u) => ({ ...u, name: e.target.value }))
                  }
                  autoComplete="name"
                />
              </div>

              <div className="form-row">
                <label htmlFor="ud-email">Email</label>
                <input
                  readOnly={true}
                  id="ud-email"
                  type="email"
                  placeholder="you@example.com"
                  value={user.email || ""}
                  onChange={(e) =>
                    setUser((u) => ({ ...u, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </div>

              {/* <div className="compact-actions">
                <button type="button" className="btn" onClick={handleSaveAll}>
                  Save
                </button>
              </div> */}
            </div>
          </div>

          {/* Monthly summary (real due amounts) */}
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
        </section>

        <footer className="profile-modal__footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={closeProfile}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

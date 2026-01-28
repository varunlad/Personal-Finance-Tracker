// src/components/layout/AppHeader.jsx
import { useAuth } from "../../context/auth-context";
import logo from "../../assets/logo.png";
import { useProfileModal } from "../../context/ProfileModalProvider";
import "./appHeader.css";

export default function AppHeader({ title }) {
  const { user, logout } = useAuth();
  const { openProfile } = useProfileModal();

  return (
    <header className="app-header">
      <img src={logo} alt="App Logo" className="app-logo" />
      <h1>{title}</h1>
      <div className="spacer" />

      {user && (
        <>
          <button
            type="button"
            className="btn-secondary btn-profile-rtl"
            onClick={openProfile}
            aria-label="Open Profile"
          >
            <span className="btn-icon" aria-hidden="true">👤</span>
            <span className="btn-label">Profile</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={logout}
            aria-label="Logout"
          >
            ↩︎
          </button>
        </>
      )}
    </header>
  );
}
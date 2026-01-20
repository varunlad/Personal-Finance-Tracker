
// src/components/layout/AppHeader.jsx
// import { useTheme } from '../../context/theme-context'
import { useAuth } from "../../context/auth-context";
import logo from "../../assets/logo.png";
import { useProfileModal } from "../../context/ProfileModalProvider";

export default function AppHeader({ title }) {
  // const { theme, toggleTheme } = useTheme()
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
            className="btn-secondary"
            onClick={openProfile}
            aria-label="Open Profile"
          >
            Profile
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={logout}
          >
            Logout
          </button>
        </>
      )}

      {/* <button type="button" className="btn-secondary" onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button> */}
    </header>
  );
}
``

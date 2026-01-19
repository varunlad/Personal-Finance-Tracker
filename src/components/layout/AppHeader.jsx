// import { useTheme } from '../../context/theme-context'
import { useAuth } from "../../context/auth-context";
import logo from "../../assets/logo.png";

export default function AppHeader({ title }) {
  // const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <img src={logo} alt="App Logo" className="app-logo" />
      <h1>{title}</h1>
      <div className="spacer" />
      {user && (
        <button
          type="button"
          className="btn-secondary"
          onClick={logout}
        >
          Logout
        </button>
      )}
      {/* <button type="button" className="btn-secondary" onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button> */}
    </header>
  );
}

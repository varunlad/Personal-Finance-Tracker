
// import { useTheme } from '../../context/theme-context'
import { useAuth } from '../../context/auth-context'

export default function AppHeader({ title }) {
  // const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <h1>{title}</h1>
      <div className="spacer" />
      {user && (
        <button type="button" className="btn-secondary" onClick={logout} style={{ marginRight: 8 }}>
          Logout
        </button>
      )}
      {/* <button type="button" className="btn-secondary" onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button> */}
    </header>
  )
}

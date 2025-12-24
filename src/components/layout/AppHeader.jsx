
// src/components/layout/AppHeader.jsx
import { useTheme } from '../../context/theme-context'

export default function AppHeader({ title }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="app-header">
      <h1>{title}</h1>
      <div className="spacer" />
      <button type="button" className="btn-secondary" onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </header>
  )
}

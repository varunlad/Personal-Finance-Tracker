import { useEffect } from 'react'
import { useTheme } from './context/theme-context'
import ThemeProvider from './context/ThemeProvider'
import AuthProvider from './context/AuthProvider'

import './styles/theme.css'
import './styles/index.css'

import AppHeader from './components/layout/AppHeader'
import ProtectedContainer from './components/common/ProtectedContainer'

function AppContent() {
  const { theme } = useTheme()

  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  return (
    <div className={`app theme-${theme}`}>
      <AppHeader title="Personal Finance Tracker" />
      <ProtectedContainer>
        {/* main app content; visible only when logged in */}
        <section className="card">
          <p>Welcome! You’re logged in.</p>
        </section>
      </ProtectedContainer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  )
}

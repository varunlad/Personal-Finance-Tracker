
// src/App.jsx
import { useEffect } from 'react'
import { useTheme } from './context/theme-context'
import ThemeProvider from './context/ThemeProvider'
import AuthProvider from './context/AuthProvider'

import './styles/theme.css'
import './styles/index.css'

import AppHeader from './components/layout/AppHeader'
import ProtectedContainer from './components/common/ProtectedContainer'
import DailyExpensesPage from './components/daily/DailyExpensesPage'

// ✅ Minimal, simple provider and modal host
import Profile from './components/profile/Profile'
import { ProfileModalProvider } from './context/ProfileModalProvider'

function AppContent() {
  const { theme } = useTheme()

  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  return (
    <div className={`app theme-${theme}`}>
      <AppHeader title="Finance Tracker" />
      <ProtectedContainer>
        <DailyExpensesPage />
      </ProtectedContainer>

      {/* Modal is hosted here, but all logic lives outside App */}
      <Profile />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProfileModalProvider>
          <AppContent />
        </ProfileModalProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

import { useEffect } from 'react'
import { useTheme } from './context/theme-context'
import ThemeProvider from './context/ThemeProvider'

import './styles/theme.css'
import './styles/index.css'

import AppHeader from './components/layout/AppHeader'
import AppContainer from './components/layout/AppContainer'

function AppContent() {
  const { theme } = useTheme()

  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  return (
    <div className={`app theme-${theme}`}>
      <AppHeader title="Personal Finance Tracker" />

      <AppContainer>
        <section className="card">
          <p>
            Theme: <strong>{theme}</strong>
          </p>
        </section>
      </AppContainer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

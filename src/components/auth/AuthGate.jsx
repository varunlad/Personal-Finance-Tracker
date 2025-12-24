
import { useState } from 'react'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'
import { useAuth } from '../../context/auth-context'

export default function AuthGate() {
  const { user } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  if (user) return null // authenticated—let ProtectedContainer render main app

  return mode === 'login'
    ? <LoginPage onSwitchToSignup={() => setMode('signup')} />
    : <SignupPage onSwitchToLogin={() => setMode('login')} />
}
``

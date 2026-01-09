
// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { request } from '../api/http'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    try {
      const t = localStorage.getItem('auth_token')
      const u = localStorage.getItem('auth_user')
      if (t && u) {
        setToken(t)
        setUser(JSON.parse(u))
      }
    } finally {
      setInitializing(false)
    }
  }, [])

  const persist = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('auth_token', nextToken)
    localStorage.setItem('auth_user', JSON.stringify(nextUser))
  }

  const clear = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const login = async (email, password) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    persist(data.token, data.user)
    return data.user
  }

  const signup = async ({ name, email, password, acceptTerms = true }) => {
    return request('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password, acceptTerms },
    })
  }

  const logout = () => clear()

  const authHeader = useMemo(() => (
    token ? { Authorization: `Bearer ${token}` } : {}
  ), [token])

  return (
    <AuthContext.Provider value={{ user, token, initializing, login, signup, logout, authHeader }}>
      {children}
    </AuthContext.Provider>
  )
}

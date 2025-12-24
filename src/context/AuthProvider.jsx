
import { useState } from 'react'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // Mock login
  const login = async (email, password) => {
    if (!email || !password) throw new Error('Please enter email and password')
    await new Promise(res => setTimeout(res, 300))
    setUser({ email })
  }

  // Mock signup (no server yet)
  const signup = async ({ name, email, password }) => {
    if (!name || !email || !password) throw new Error('Please fill all required fields')
    await new Promise(res => setTimeout(res, 400))
    // after successful signup, auto-login for demo
    setUser({ email, name })
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

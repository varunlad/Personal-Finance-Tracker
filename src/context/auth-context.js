
import { createContext, useContext } from 'react'

export const AuthContext = createContext({
  user: null,
  token: null,
  initializing: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  authHeader: {},
})

export const useAuth = () => useContext(AuthContext)

import { createContext, useContext } from 'react'

export const AuthContext = createContext({
  user: null,
  login: async () => {},
  signup: async () => {}, 
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

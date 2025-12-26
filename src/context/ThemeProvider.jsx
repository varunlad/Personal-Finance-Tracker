
import React, { useState } from 'react'
import { ThemeContext } from './theme-context'

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark') 
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

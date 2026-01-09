
import { useState } from 'react'
import { useAuth } from '../../context/auth-context'
import '../../styles/auth.css'

export default function SignupPage({ onSwitchToLogin }) {
  const { signup } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  const passwordStrength = (val) => {
    const longEnough = val.length >= 8
    const hasLetter = /[A-Za-z]/.test(val)
    const hasDigit = /\d/.test(val)
    return { longEnough, hasLetter, hasDigit, ok: longEnough && hasLetter && hasDigit }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter your name')
    if (!isEmailValid(email)) return setError('Please enter a valid email')
    const strength = passwordStrength(password)
    if (!strength.ok) return setError('Password must be at least 8 chars, include letters and numbers')
    if (password !== confirm) return setError('Passwords do not match')
    if (!accepted) return setError('Please accept the terms')

    setLoading(true)
    try {
      await signup({ name: name.trim(), email: email.trim(), password, acceptTerms: accepted })
      // optional: after signup show login
      onSwitchToLogin?.()
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = passwordStrength(password)

  return (
    <main className="auth-container">
      <section className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Sign up to start tracking your finances</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Name</span>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="password-strength">
              <span className={strength.longEnough ? 'ok' : 'fail'}>• 8+ chars</span>
              <span className={strength.hasLetter ? 'ok' : 'fail'}>• letter</span>
              <span className={strength.hasDigit ? 'ok' : 'fail'}>• number</span>
            </div>
          </label>

          <label>
            <span>Confirm Password</span>
            <div className="password-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowConfirm((s) => !s)}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <label className="terms">
            <input type="checkbox" checked={accepted} onChange={() => setAccepted((a) => !a)} />
            <span>I accept the Terms &amp; Privacy Policy</span>
          </label>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?
          <button type="button" onClick={onSwitchToLogin} className="link-btn">
            Login
          </button>
        </p>
      </section>
    </main>
  )
}

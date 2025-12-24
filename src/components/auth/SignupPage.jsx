
import { useState } from 'react'
import { useAuth } from '../../context/auth-context'

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

  // simple validators
  const isEmailValid = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const passwordStrength = (val) => {
    // length ≥ 8, includes letter and digit
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
      await signup({ name: name.trim(), email: email.trim(), password })
      // success: AuthProvider will set user; the ProtectedContainer will take over
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = passwordStrength(password)

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
        <h2 style={{ marginBottom: 12 }}>Create account</h2>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
          Sign up to start tracking your finances
        </p>

        {error && <p className="text-red" style={{ marginBottom: 12 }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Name</span>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: 8 }}
              required
            />
          </label>

          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 8 }}
              required
            />
          </label>

          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Password</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{ flex: 1, padding: 8 }}
                required
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPassword(s => !s)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {/* Inline strength helper */}
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              <span style={{ color: strength.longEnough ? 'var(--green)' : 'var(--red)' }}>• 8+ chars</span>{' '}
              <span style={{ color: strength.hasLetter ? 'var(--green)' : 'var(--red)' }}>• letter</span>{' '}
              <span style={{ color: strength.hasDigit ? 'var(--green)' : 'var(--red)' }}>• number</span>
            </div>
          </label>

          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Confirm Password</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                style={{ flex: 1, padding: 8 }}
                required
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirm(s => !s)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={accepted} onChange={() => setAccepted(a => !a)} />
            <span className="muted" style={{ fontSize: 13 }}>
              I accept the Terms & Privacy Policy
            </span>
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn-secondary" onClick={onSwitchToLogin}>
            Already have an account? Sign in
          </button>
        </div>
      </section>
    </main>
  )
}

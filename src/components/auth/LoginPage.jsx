
import { useState } from 'react'
import { useAuth } from '../../context/auth-context'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h2 style={{ marginBottom: 12 }}>Login</h2>

        {error && <p className="text-red" style={{ marginBottom: 12 }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Demo login accepts any email/password (no server yet).
        </p>
      </section>
    </main>
  )
}

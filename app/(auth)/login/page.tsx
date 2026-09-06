'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    setLoading(false)
    if (error) {
      return setError(error.message)
    }
    
    router.push('/')
    router.refresh()
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      return setError('Please enter your email address first.')
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset link sent! Check your email inbox.')
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {isResetMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p style={styles.subtitle}>
            {isResetMode 
              ? 'Enter your email and we will send you a link to reset your password'
              : 'Please enter your credentials to access your account'}
          </p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        {!isResetMode ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label}>Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  style={styles.textButton}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                style={styles.textButton}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {!isResetMode && (
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Don't have an account?{' '}
              <Link href="/register" style={styles.link}>
                Create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    maxWidth: '440px',
    margin: '0 auto',
    paddingTop: '100px',
    paddingBottom: '4rem',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e8e2d9',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontFamily: 'serif',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f1815',
    margin: '0 0 0.25rem 0',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: '#786f66',
    margin: 0,
  },
  errorBox: {
    padding: '0.75rem',
    backgroundColor: '#fff8f8',
    border: '1px solid #f5c6c6',
    color: '#a82323',
    fontSize: '0.8rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: 500,
  },
  successBox: {
    padding: '0.75rem',
    backgroundColor: '#f3f8f3',
    border: '1px solid #d4e6d4',
    color: '#275e27',
    fontSize: '0.8rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.35rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#8c827a',
    marginBottom: '0.35rem',
  },
  input: {
    width: '100%',
    backgroundColor: '#faf8f5',
    border: '1px solid #dcd5ca',
    borderRadius: '8px',
    padding: '0.65rem 0.75rem',
    fontSize: '0.875rem',
    color: '#1f1815',
    outline: 'none',
    boxSizing: 'border-box',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#1f1815',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#c0633b',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  footer: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f2ede4',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.8rem',
    color: '#786f66',
    margin: 0,
  },
  link: {
    color: '#c0633b',
    fontWeight: 600,
    textDecoration: 'none',
  },
}

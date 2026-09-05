'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Account created! Check your email or try signing in.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Please fill in your details to get started</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>
              Sign In
            </Link>
          </p>
        </div>
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
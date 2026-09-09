'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      // Check if user already exists or identity is linked/taken
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists')
      ) {
        setError('An account with this email already exists. Redirecting to sign in...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(error.message)
      }
    } else {
      // Note: If Supabase has email confirmation enabled, identities might return empty identities array or a user object.
      // If user data identity is empty or user already existed without a session:
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Redirecting to sign in...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        return
      }

      setMessage('Account created successfully! Redirecting...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <main style={styles.main}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        body {
          margin: 0;
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
          animation: gradientFlow 15s ease infinite;
          min-height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .animated-card {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        input:focus {
          border-color: #23a6d5 !important;
          box-shadow: 0 0 0 3px rgba(35, 166, 213, 0.15);
        }
      `}</style>

      <div style={{ ...styles.card }} className="animated-card">
        <div style={styles.header}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join us and explore interactive features</p>
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
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.passwordInput}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
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
    paddingTop: '80px',
    paddingBottom: '4rem',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #23a6d5 0%, #e73c7e 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 0.35rem 0',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '0.8rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: 500,
  },
  successBox: {
    padding: '0.75rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    fontSize: '0.8rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.15rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#475569',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '0.75rem 0.85rem',
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '0.75rem 2.5rem 0.75rem 0.85rem',
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #23a6d5 0%, #23d5ab 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.85rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    marginTop: '0.75rem',
    boxShadow: '0 4px 12px rgba(35, 166, 213, 0.3)',
    transition: 'transform 0.1s ease, box-shadow 0.2s ease',
  },
  footer: {
    marginTop: '1.75rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
  },
  link: {
    color: '#23a6d5',
    fontWeight: 700,
    textDecoration: 'none',
  },
}

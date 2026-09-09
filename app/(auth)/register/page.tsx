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

    // Supabase signUp. Note: Depending on project settings, Supabase might return an identity 
    // or success message even if email exists (if email enumeration protection is enabled). 
    // However, if the error indicates a duplicate or user already exists, we catch it and redirect.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (signUpError) {
      // Check if user already exists based on common Supabase error messages
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already exists')
      ) {
        setError('An account with this email already exists. Redirecting to login...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(signUpError.message)
      }
    } else {
      // Sometimes Supabase returns a user with empty identities if the user already exists (depending on config)
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Redirecting to login...')
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
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animated-card {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .input-field:focus {
          border-color: #c0633b !important;
          box-shadow: 0 0 0 3px rgba(192, 99, 59, 0.15);
          background-color: #ffffff !important;
        }
        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(192, 99, 59, 0.3);
        }
        .submit-btn:active {
          transform: translateY(0px);
        }
      `}</style>

      {/* Decorative background gradient blobs for interactive feel */}
      <div style={styles.bgBlobTop} />
      <div style={styles.bgBlobBottom} />

      <div style={styles.card} className="animated-card">
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
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
              className="input-field"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.passwordInput}
                className="input-field"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span style={styles.loadingWrapper}>
                <span style={styles.spinner} />
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
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
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #fcf9f5 0%, #f4ede2 100%)',
    padding: '1rem',
    boxSizing: 'border-box',
  },
  bgBlobTop: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '400px',
    height: '400px',
    background: 'linear-gradient(135deg, rgba(192, 99, 59, 0.12) 0%, rgba(212, 163, 115, 0.05) 100%)',
    borderRadius: '50%',
    filter: 'blur(60px5)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: '-10%',
    left: '-10%',
    width: '400px',
    height: '400px',
    background: 'linear-gradient(135deg, rgba(140, 130, 122, 0.1) 0%, rgba(192, 99, 59, 0.08) 100%)',
    borderRadius: '50%',
    filter: 'blur(60px)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(232, 226, 217, 0.8)',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    boxShadow: '0 10px 30px rgba(31, 24, 21, 0.06), 0 1px 3px rgba(31, 24, 21, 0.03)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    margin: '0 auto 1rem auto',
    background: 'linear-gradient(135deg, #c0633b 0%, #e08b65 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(192, 99, 59, 0.25)',
  },
  title: {
    fontFamily: 'serif',
    fontSize: '1.85rem',
    fontWeight: 700,
    color: '#1f1815',
    margin: '0 0 0.35rem 0',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#786f66',
    margin: 0,
  },
  errorBox: {
    padding: '0.75rem 1rem',
    backgroundColor: '#fff5f5',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '0.825rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    fontWeight: 500,
    animation: 'fadeIn 0.3s ease-out',
  },
  successBox: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    fontSize: '0.825rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    fontWeight: 500,
    animation: 'fadeIn 0.3s ease-out',
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
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#8c827a',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    backgroundColor: '#faf8f5',
    border: '1px solid #dcd5ca',
    borderRadius: '10px',
    padding: '0.75rem 0.85rem',
    fontSize: '0.9rem',
    color: '#1f1815',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    backgroundColor: '#faf8f5',
    border: '1px solid #dcd5ca',
    borderRadius: '10px',
    padding: '0.75rem 2.5rem 0.75rem 0.85rem',
    fontSize: '0.9rem',
    color: '#1f1815',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#8c827a',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    transition: 'color 0.2s',
  },
  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #1f1815 0%, #3d322c 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.85rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginTop: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 12px rgba(31, 24, 21, 0.15)',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    marginTop: '1.75rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(242, 237, 228, 0.8)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.825rem',
    color: '#786f66',
    margin: 0,
  },
  link: {
    color: '#c0633b',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
}

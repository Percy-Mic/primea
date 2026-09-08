'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserNavProps {
  brandName?: string
  title?: string
  description?: string
  userEmail?: string
  onLogout?: () => Promise<void> | void
}

export default function UserNav({ 
  brandName = 'PRIMEA', 
  title, 
  description, 
  userEmail, 
  onLogout 
}: UserNavProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (userEmail) {
      setLoading(false)
      return
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, userEmail])

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout()
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayEmail = userEmail || user?.email
  const isAuthed = !!userEmail || !!user

  return (
    <header style={styles.header}>
      <style>{`
        .mobile-hamburger {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-hamburger {
            display: block !important;
          }
          .desktop-nav-links,
          .desktop-auth-container {
            display: none !important;
          }
        }
      `}</style>

      <div style={styles.navContainer}>
        {/* Brand Logo & Optional Page Title */}
        <div style={styles.brandWrapper}>
          {title && (
            <div style={styles.titleWrapper}>
              <div>
                <span style={styles.pageTitle}>{title}</span>
                {description && <p style={styles.pageDescription}>{description}</p>}
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop Nav Links */}
        <div className="desktop-nav-links" style={styles.desktopNav}>
          <Link href="/attendance" style={styles.navLink}>ATTENDANCE</Link>
          <Link href="/profile" style={styles.navLink}>PROFILE</Link>
          <Link href="/admin_list" style={styles.navLink}>ADMIN LIST</Link>
          {isAuthed && (
            <Link href="/logged_action" style={styles.ordersButton}>
              <span style={styles.activeDot} /> LOGGED ACTION
            </Link>
          )}
        </div>

        {/* User Auth Controls (Desktop) */}
        <div className="desktop-auth-container" style={styles.rightContainer}>
          {loading ? (
            <span style={styles.guestText}>Loading...</span>
          ) : isAuthed ? (
            <div style={styles.loggedInContainer}>
              <div style={styles.userInfo}>
                <span style={styles.badge}>LOGGED IN</span>
                <span style={styles.email}>{displayEmail}</span>
              </div>
              <button onClick={handleSignOut} style={styles.signOutButton}>
                Sign Out
              </button>
            </div>
          ) : (
            <div style={styles.guestContainer}>
              <Link href="/login" style={styles.loginLink}>Sign In</Link>
              <Link href="/register" style={styles.registerLink}>Register</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Hamburger Button */}
        <button 
          className="mobile-hamburger"
          style={styles.hamburgerButton} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={styles.mobileDrawer}>
          <div style={styles.mobileLinks}>
            <Link href="/attendance" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>ATTENDANCE</Link>
            <Link href="/profile" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>PROFILE</Link>
            <Link href="/admin_list" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>ADMIN LIST</Link>
            {isAuthed && (
              <Link href="/logged_action" style={styles.mobileOrdersButton} onClick={() => setMobileMenuOpen(false)}>
                <span style={styles.activeDot} /> LOGGED ACTION
              </Link>
            )}
          </div>

          <div style={styles.mobileAuthSection}>
            {isAuthed ? (
              <div style={styles.mobileLoggedIn}>
                <div style={styles.userInfo}>
                  <span style={styles.badge}>LOGGED IN</span>
                  <span style={styles.email}>{displayEmail}</span>
                </div>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={styles.guestContainer}>
                <Link href="/login" style={styles.loginLink} onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                <Link href="/register" style={styles.registerLink} onClick={() => setMobileMenuOpen(false)}>Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: '#16120f',
    borderBottom: '1px solid #2a221e',
    width: '100%',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  brandLink: {
    fontFamily: 'serif',
    fontSize: '1.5rem',
    letterSpacing: '0.15em',
    color: '#f5efe6',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  divider: {
    color: '#4a3d35',
    fontSize: '1.2rem',
  },
  pageTitle: {
    color: '#f5efe6',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    display: 'block',
  },
  pageDescription: {
    color: '#a89f91',
    fontSize: '0.75rem',
    margin: 0,
  },
  desktopNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  navLink: {
    color: '#d4cec5',
    textDecoration: 'none',
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    fontWeight: 600,
    fontFamily: 'sans-serif',
  },
  ordersButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid #3a302a',
    borderRadius: '20px',
    padding: '0.4rem 1rem',
    color: '#f5efe6',
    textDecoration: 'none',
    fontSize: '0.8rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
    backgroundColor: 'transparent',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  loggedInContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  badge: {
    fontSize: '0.55rem',
    letterSpacing: '0.08em',
    backgroundColor: '#064e3b',
    color: '#6ee7b7',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 700,
  },
  email: {
    color: '#a89f91',
    fontSize: '0.75rem',
    fontFamily: 'sans-serif',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  guestContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  guestText: {
    color: '#a89f91',
    fontSize: '0.85rem',
  },
  loginLink: {
    color: '#f5efe6',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '0.4rem 0.8rem',
  },
  registerLink: {
    backgroundColor: '#f5efe6',
    color: '#16120f',
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  signOutButton: {
    background: 'none',
    border: '1px solid #7f1d1d',
    borderRadius: '20px',
    padding: '0.35rem 0.9rem',
    color: '#fca5a5',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
  },
  hamburgerButton: {
    background: 'none',
    border: 'none',
    color: '#f5efe6',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  mobileDrawer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '1.5rem 2rem',
    backgroundColor: '#16120f',
    borderTop: '1px solid #2a221e',
  },
  mobileLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  mobileNavLink: {
    color: '#d4cec5',
    textDecoration: 'none',
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  mobileOrdersButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid #3a302a',
    borderRadius: '20px',
    padding: '0.5rem 1rem',
    color: '#f5efe6',
    textDecoration: 'none',
    fontSize: '0.8rem',
    width: 'fit-content',
  },
  mobileAuthSection: {
    borderTop: '1px solid #2a221e',
    paddingTop: '1rem',
  },
  mobileLoggedIn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}

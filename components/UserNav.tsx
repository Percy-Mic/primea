'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserNavProps {
  brandName?: string
}

export default function UserNav({ brandName = 'PRIMEA' }: UserNavProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
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
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header style={styles.header}>
      <div style={styles.navContainer}>
        {/* Brand Logo */}
        <Link href="/" style={styles.brandLink}>
          {brandName}
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={styles.desktopNav}>
          <Link href="/" style={styles.navLink}>STOREFRONT</Link>
          <Link href="/products" style={styles.navLink}>PRODUCTS</Link>
          <Link href="/cart" style={styles.navLink}>CART</Link>
          {user && (
            <Link href="/orders" style={styles.ordersButton}>
              <span style={styles.activeDot} /> MY ORDERS
            </Link>
          )}
        </nav>

        {/* User Auth Controls (Desktop) */}
        <div style={styles.rightContainer}>
          {loading ? (
            <span style={styles.guestText}>Loading...</span>
          ) : user ? (
            <div style={styles.loggedInContainer}>
              <div style={styles.userInfo}>
                <span style={styles.badge}>LOGGED IN</span>
                <span style={styles.email}>{user.email}</span>
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
            <Link href="/" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>STOREFRONT</Link>
            <Link href="/products" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>PRODUCTS</Link>
            <Link href="/cart" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>CART</Link>
            {user && (
              <Link href="/orders" style={styles.mobileOrdersButton} onClick={() => setMobileMenuOpen(false)}>
                <span style={styles.activeDot} /> MY ORDERS
              </Link>
            )}
          </div>

          <div style={styles.mobileAuthSection}>
            {user ? (
              <div style={styles.mobileLoggedIn}>
                <div style={styles.userInfo}>
                  <span style={styles.badge}>LOGGED IN</span>
                  <span style={styles.email}>{user.email}</span>
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
  brandLink: {
    fontFamily: 'serif',
    fontSize: '1.5rem',
    letterSpacing: '0.15em',
    color: '#f5efe6',
    textDecoration: 'none',
    fontWeight: 'bold',
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
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#f5efe6',
    fontSize: '1.5rem',
    cursor: 'pointer',
    '@media(max-width: 768px)': {
      display: 'block',
    },
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

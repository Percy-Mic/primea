'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UserNav() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return <div style={styles.guestText}>Loading...</div>
  }

  return (
    <nav style={styles.navContainer}>
      {/* Storefront & Cart Links */}
      <div style={styles.leftLinks}>
        <Link href="/products" style={styles.navLink}>
          Shop
        </Link>
        <Link href="/cart" style={styles.navLink}>
          Cart
        </Link>
      </div>

      {/* User Session / Auth Controls */}
      <div style={styles.rightContainer}>
        {user ? (
          <div style={styles.loggedInContainer}>
            <div style={styles.userInfo}>
              <span style={styles.badge}>Active</span>
              <span style={styles.email}>{user.email}</span>
            </div>
            <button onClick={handleSignOut} style={styles.signOutButton}>
              Sign Out
            </button>
          </div>
        ) : (
          <div style={styles.guestContainer}>
            <Link href="/login" style={styles.loginLink}>
              Sign In
            </Link>
            <Link href="/register" style={styles.registerLink}>
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: '1rem',
    fontSize: '0.85rem',
    flexWrap: 'wrap',
  },
  leftLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  navLink: {
    color: '#1f1815',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    fontFamily: 'sans-serif',
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  loggedInContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  badge: {
    fontSize: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    padding: '0.05rem 0.3rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  email: {
    color: '#786e65',
    fontSize: '0.75rem',
    fontFamily: 'sans-serif',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  guestContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  guestText: {
    color: '#786f66',
  },
  loginLink: {
    color: '#1f1815',
    textDecoration: 'none',
    fontWeight: 600,
    padding: '0.3rem 0.5rem',
    fontFamily: 'sans-serif',
  },
  registerLink: {
    backgroundColor: '#1f1815',
    color: '#ffffff',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
    fontFamily: 'sans-serif',
  },
  signOutButton: {
    background: 'none',
    border: '1px solid #dcd5ca',
    borderRadius: '6px',
    padding: '0.3rem 0.6rem',
    color: '#a82323',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.75rem',
    fontFamily: 'sans-serif',
  },
}

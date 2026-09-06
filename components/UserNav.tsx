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
    // Get initial user session
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    // Listen for login/logout changes dynamically
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
    <div style={styles.container}>
      {user ? (
        <div style={styles.loggedInContainer}>
          <div style={styles.userInfo}>
            <span style={styles.badge}>Logged In</span>
            <span style={styles.email}>{user.email}</span>
          </div>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      ) : (
        <div style={styles.guestContainer}>
          <span style={styles.guestBadge}>Guest Mode</span>
          <Link href="/login" style={styles.loginLink}>
            Sign In
          </Link>
          <Link href="/register" style={styles.registerLink}>
            Register
          </Link>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItem: 'center',
    fontSize: '0.85rem',
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
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  guestBadge: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#f1f3f4',
    color: '#5f6368',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  email: {
    color: '#1f1815',
    fontWeight: 500,
    fontSize: '0.8rem',
  },
  guestContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  guestText: {
    color: '#786f66',
  },
  loginLink: {
    color: '#1f1815',
    textDecoration: 'none',
    fontWeight: 600,
  },
  registerLink: {
    backgroundColor: '#1f1815',
    color: '#ffffff',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
  },
  signOutButton: {
    background: 'none',
    border: '1px solid #dcd5ca',
    borderRadius: '6px',
    padding: '0.35rem 0.65rem',
    color: '#a82323',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
}

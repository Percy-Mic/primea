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
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .luxury-icon-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .luxury-icon-hover:hover {
          border-color: #d4af37 !important;
          color: #ffffff !important;
          background-color: rgba(212, 175, 55, 0.12) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15);
        }
        @media (max-width: 640px) {
          .nav-inner-container {
            padding: 0.5rem 1rem !important;
          }
          .brand-title-wrapper {
            max-width: 130px;
          }
        }
      `}</style>

      <div style={styles.navContainer} className="nav-inner-container">
        {/* Brand Logo & Optional Page Title */}
        <div style={styles.brandWrapper} className="brand-title-wrapper">
          {title ? (
            <div style={styles.titleWrapper}>
              <div>
                <span style={styles.pageTitle} title={title}>{title}</span>
                {description && <p style={styles.pageDescription} title={description}>{description}</p>}
              </div>
            </div>
          ) : (
            <span style={styles.brandLogo}>{brandName}</span>
          )}
        </div>
        
        {/* Quick Horizontal Icon Navigation (All Devices) */}
        <div style={styles.navIconsGroup}>
          <Link href="/attendance" style={styles.iconButton} className="luxury-icon-hover" title="Attendance">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </Link>
          
          <Link href="/profile" style={styles.iconButton} className="luxury-icon-hover" title="Profile">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </Link>
          
          <Link href="/admin_list" style={styles.iconButton} className="luxury-icon-hover" title="Admin List">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </Link>

          {isAuthed && (
            <Link href="/logged_action" style={{ ...styles.iconButton, position: 'relative' }} className="luxury-icon-hover" title="Chats">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span style={styles.activeDotAbsolute} /> 
            </Link>
          )}

          <div style={styles.separator} />

          {/* User Authentication Actions */}
          {loading ? (
            <span style={styles.guestText}>...</span>
          ) : isAuthed ? (
            <button onClick={handleSignOut} style={styles.iconButtonAction} className="luxury-icon-hover" title={`Sign Out (${displayEmail})`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          ) : (
            <div style={styles.authGroup}>
              <Link href="/login" style={styles.iconButton} className="luxury-icon-hover" title="Sign In">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              </Link>
              <Link href="/register" style={styles.registerIconButton} className="luxury-icon-hover" title="Register">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    background: 'linear-gradient(135deg, #1b1613 0%, #110e0c 100%)',
    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    width: '100%',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    backdropFilter: 'blur(12px)',
  },
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandLogo: {
    color: '#f5efe6',
    fontSize: '0.95rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  pageTitle: {
    color: '#f5efe6',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pageDescription: {
    color: '#a89f91',
    fontSize: '0.68rem',
    margin: 0,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  navIconsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '50%',
    color: '#d4cec5',
    textDecoration: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  iconButtonAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '1px solid rgba(127, 29, 29, 0.5)',
    borderRadius: '50%',
    color: '#fca5a5',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  registerIconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: '50%',
    color: '#110e0c',
    boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)',
  },
  activeDotAbsolute: {
    position: 'absolute',
    top: '7px',
    right: '7px',
    width: '5px',
    height: '5px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulseGlow 2s infinite',
  },
  separator: {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '0 0.25rem',
  },
  authGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  guestText: {
    color: '#a89f91',
    fontSize: '0.75rem',
  },
}

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
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .luxury-nav-link {
          position: relative;
          transition: color 0.3s ease;
        }
        .luxury-nav-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 1px;
          bottom: -4px;
          left: 0;
          background-color: #d4af37;
          transition: width 0.3s ease;
        }
        .luxury-nav-link:hover::after {
          width: 100%;
        }
        .luxury-btn-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .luxury-btn-hover:hover {
          border-color: #d4af37 !important;
          color: #ffffff !important;
          background-color: rgba(212, 175, 55, 0.08) !important;
          transform: translateY(-1px);
        }
        .mobile-hamburger {
          display: none;
        }
        .mobile-drawer-animate {
          animation: fadeInDown 0.3s ease-in-out forwards;
        }
        @media (max-width: 960px) {
          .mobile-hamburger {
            display: flex !important;
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
          <div style={styles.brandBadge}>
            <span style={styles.brandLetter}>{brandName.charAt(0)}</span>
          </div>
          {title && (
            <div style={styles.titleWrapper}>
              <span style={styles.pageTitle}>{title}</span>
              {description && <p style={styles.pageDescription}>{description}</p>}
            </div>
          )}
        </div>
        
        {/* Desktop Nav Links */}
        <div className="desktop-nav-links" style={styles.desktopNav}>
          <Link href="/attendance" style={styles.navLink} className="luxury-nav-link">
            ATTENDANCE
          </Link>
          <Link href="/profile" style={styles.navLink} className="luxury-nav-link">
            PROFILE
          </Link>
          <Link href="/admin_list" style={styles.navLink} className="luxury-nav-link">
            ADMIN LIST
          </Link>
          
          {isAuthed && (
            <div style={styles.actionPillsGroup}>
              <Link href="/chats" style={styles.pillButton} className="luxury-btn-hover">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>CHATS</span>
              </Link>
              <Link href="/system_log" style={styles.pillButton} className="luxury-btn-hover">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                <span style={styles.activeDot} /> 
                <span>SYSTEM LOG</span>
              </Link>
            </div>
          )}
        </div>

        {/* User Auth Controls (Desktop) */}
        <div className="desktop-auth-container" style={styles.rightContainer}>
          {loading ? (
            <span style={styles.guestText}>Loading...</span>
          ) : isAuthed ? (
            <div style={styles.loggedInContainer}>
              <div style={styles.userInfo}>
                <span style={styles.badge}>VERIFIED</span>
                <span style={styles.email} title={displayEmail}>{displayEmail}</span>
              </div>
              <button onClick={handleSignOut} style={styles.signOutButton} className="luxury-btn-hover">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign Out
              </button>
            </div>
          ) : (
            <div style={styles.guestContainer}>
              <Link href="/login" style={styles.loginLink} className="luxury-nav-link">Sign In</Link>
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
        <div style={styles.mobileDrawer} className="mobile-drawer-animate">
          <div style={styles.mobileLinks}>
            <Link href="/attendance" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>ATTENDANCE</Link>
            <Link href="/profile" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>PROFILE</Link>
            <Link href="/admin_list" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>ADMIN LIST</Link>
            {isAuthed && (
              <div style={styles.mobilePillsGroup}>
                <Link href="/chats" style={styles.mobilePillButton} onClick={() => setMobileMenuOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  CHATS
                </Link>
                <Link href="/system_log" style={styles.mobilePillButton} onClick={() => setMobileMenuOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                  <span style={styles.activeDot} /> SYSTEM LOG
                </Link>
              </div>
            )}
          </div>

          <div style={styles.mobileAuthSection}>
            {isAuthed ? (
              <div style={styles.mobileLoggedIn}>
                <div style={styles.userInfo}>
                  <span style={styles.badge}>VERIFIED</span>
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
    background: 'linear-gradient(135deg, #1b1613 0%, #110e0c 100%)',
    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    width: '100%',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(12px)',
  },
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  brandBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
  },
  brandLetter: {
    color: '#110e0c',
    fontWeight: '800',
    fontSize: '1.1rem',
    fontFamily: 'serif',
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  pageTitle: {
    color: '#f5efe6',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  pageDescription: {
    color: '#a89f91',
    fontSize: '0.72rem',
    margin: 0,
    letterSpacing: '0.02em',
  },
  desktopNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.75rem',
  },
  navLink: {
    color: '#d4cec5',
    textDecoration: 'none',
    fontSize: '0.8rem',
    letterSpacing: '0.12em',
    fontWeight: 600,
    fontFamily: 'sans-serif',
  },
  actionPillsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginLeft: '0.5rem',
  },
  pillButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    padding: '0.35rem 0.85rem',
    color: '#f5efe6',
    textDecoration: 'none',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulseGlow 2s infinite',
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  loggedInContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  badge: {
    fontSize: '0.5rem',
    letterSpacing: '0.1em',
    backgroundColor: 'rgba(6, 78, 59, 0.6)',
    border: '1px solid rgba(110, 231, 183, 0.3)',
    color: '#6ee7b7',
    padding: '0.05rem 0.35rem',
    borderRadius: '4px',
    fontWeight: 700,
  },
  email: {
    color: '#c2b8a9',
    fontSize: '0.75rem',
    fontFamily: 'sans-serif',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '2px',
  },
  guestContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  guestText: {
    color: '#a89f91',
    fontSize: '0.85rem',
  },
  loginLink: {
    color: '#f5efe6',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: '0.08em',
    padding: '0.4rem 0.6rem',
  },
  registerLink: {
    background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
    color: '#110e0c',
    padding: '0.45rem 1.1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.08em',
    boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)',
    transition: 'transform 0.2s ease',
  },
  signOutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid rgba(127, 29, 29, 0.5)',
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
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.4rem 0.6rem',
    color: '#f5efe6',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  mobileDrawer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    padding: '1.5rem 2rem',
    background: 'linear-gradient(180deg, #1b1613 0%, #110e0c 100%)',
    borderTop: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
  },
  mobileLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  mobileNavLink: {
    color: '#d4cec5',
    textDecoration: 'none',
    fontSize: '0.85rem',
    letterSpacing: '0.12em',
    fontWeight: 600,
  },
  mobilePillsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  mobilePillButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '0.5rem 1rem',
    color: '#f5efe6',
    textDecoration: 'none',
    fontSize: '0.78rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    width: 'fit-content',
  },
  mobileAuthSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '1rem',
  },
  mobileLoggedIn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}

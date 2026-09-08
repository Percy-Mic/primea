'use client'

import { useRouter } from 'next/navigation'

interface AdminHeaderProps {
  title: string
  description?: string
  userEmail?: string
  onLogout?: () => Promise<void> | void
}

export default function AdminHeader({
  title,
  description,
  userEmail,
  onLogout,
}: AdminHeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout()
      return
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Title & Description Section */}
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{title}</h1>
          {description && <p style={styles.description}>{description}</p>}
        </div>

        {/* Admin Account & Actions */}
        <div style={styles.actionsSection}>
          {userEmail && (
            <div style={styles.userInfo}>
              <span style={styles.badge}>ADMIN</span>
              <span style={styles.email}>{userEmail}</span>
            </div>
          )}
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </div>
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
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  title: {
    fontFamily: 'serif',
    fontSize: '1.25rem',
    letterSpacing: '0.08em',
    color: '#f5efe6',
    margin: 0,
    fontWeight: 'bold',
  },
  description: {
    color: '#a89f91',
    fontSize: '0.75rem',
    margin: 0,
    fontFamily: 'sans-serif',
  },
  actionsSection: {
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
}

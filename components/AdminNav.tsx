'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface AdminHeaderProps {
  title: string
  description?: string
  userEmail: string
  onLogout: () => void
}

export default function AdminHeader({
  title,
  description,
  userEmail,
  onLogout,
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<'Out' | 'In'>('Out')
  const [timeLogs, setTimeLogs] = useState<string[]>([])

  const handleTimeToggle = () => {
    const timestamp = new Date().toLocaleTimeString()
    if (attendanceStatus === 'Out') {
      setAttendanceStatus('In')
      setTimeLogs((prev) => [`Timed In at ${timestamp}`, ...prev])
    } else {
      setAttendanceStatus('Out')
      setTimeLogs((prev) => [`Timed Out at ${timestamp}`, ...prev])
    }
  }

  return (
    <>
      <style>{`
        .admin-header-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          width: 100%;
          /* Distinct background color for a clear separation from the main content */
          background: #ffffff;
          /* Subtle drop shadow and border to elevate the header above the content */
          border-bottom: 2px solid #e6dec9;
          box-shadow: 0 4px 12px rgba(31, 24, 21, 0.05);
          padding: 1.35rem 1.25rem 1rem 1.25rem;
          box-sizing: border-box;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .admin-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .admin-title-area h1 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1f1815;
          margin: 0 0 0.15rem 0;
          letter-spacing: -0.01em;
        }

        .admin-title-area p {
          font-size: 0.8rem;
          color: #786f66;
          margin: 0;
        }

        .admin-desktop-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .admin-profile-badge {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #f4efe6;
          border: 1px solid #dfd7cc;
          padding: 0.35rem 0.8rem;
          border-radius: 999px;
          font-size: 0.78rem;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          background-color: #2e6930;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(46, 105, 48, 0.12);
        }

        .admin-nav-links-bar {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          padding-top: 0.6rem;
          border-top: 1px solid #f0eae1;
        }

        .hamburger-btn {
          display: none;
          background: none;
          border: 1px solid #dfd7cc;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.2rem;
          color: #1f1815;
          background-color: #f7f4ef;
        }

        .nav-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.75rem;
          background-color: #fcfbfa;
          border: 1px solid #ded7cc;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          color: #3b332e;
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
        }

        .nav-chip:hover {
          background-color: #f4efe6;
          border-color: #b55933;
          color: #b55933;
        }

        .nav-chip-primary {
          background-color: #1f1815;
          color: #ffffff;
          border-color: #1f1815;
        }

        .nav-chip-primary:hover {
          background-color: #3b332e;
          color: #ffffff;
          border-color: #3b332e;
        }

        .logout-btn {
          background-color: #fff5f5;
          color: #992222;
          border-color: #f0c2c2;
        }

        .logout-btn:hover {
          background-color: #fce8e8;
          color: #7a1717;
          border-color: #e0a8a8;
        }

        /* Mobile Drawer Styling */
        .mobile-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1999;
          display: flex;
          justify-content: flex-end;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.25s ease, visibility 0.25s ease;
        }

        .mobile-drawer-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-drawer {
          width: 280px;
          max-width: 80%;
          height: 100%;
          background: #ffffff;
          color: #1f1815;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: -5px 0 25px rgba(0,0,0,0.15);
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
          border-left: 1px solid #eae3d8;
        }

        .mobile-drawer-overlay.open .mobile-drawer {
          transform: translateX(0);
        }

        .mobile-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eae3d8;
          padding-bottom: 0.75rem;
        }

        .mobile-close-btn {
          background: none;
          border: none;
          color: #1f1815;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .mobile-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .mobile-links .nav-chip {
          width: 100%;
          justify-content: flex-start;
          background-color: #fcfbfa;
          border-color: #ded7cc;
          color: #3b332e;
          padding: 0.6rem 0.8rem;
        }

        .mobile-links .nav-chip:hover {
          background-color: #f4efe6;
          color: #b55933;
          border-color: #b55933;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 2000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }

        .modal-card {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 10px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          border: 1px solid #e8e2d9;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .admin-desktop-actions {
            display: none;
          }
          .admin-nav-links-bar {
            display: none;
          }
          .hamburger-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      <div className="admin-header-wrapper">
        <div className="admin-top-row">
          <div className="admin-title-area">
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>

          {/* Desktop Actions */}
          <div className="admin-desktop-actions">
            <div className="admin-profile-badge">
              <span className="online-dot" title="Online Status Active" />
              <span style={{ fontWeight: 600, color: '#1f1815' }}>{userEmail}</span>
            </div>

            <button type="button" onClick={onLogout} className="nav-chip logout-btn">
              Logout
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            ☰
          </button>
        </div>

        {/* Desktop Navigation Bar */}
        <div className="admin-nav-links-bar">
          <Link href="/admin/team" className="nav-chip">
            Admins List
          </Link>

          <button type="button" onClick={() => setShowAttendanceModal(true)} className="nav-chip">
            Attendance ({attendanceStatus === 'In' ? 'In' : 'Out'})
          </button>

          <Link href="/admin/settings" className="nav-chip">
            Edit Profile
          </Link>

          <button type="button" onClick={() => setShowNotifications(!showNotifications)} className="nav-chip">
            Notifications
          </button>

          <Link href="/admin/chats" className="nav-chip">
            Chats
          </Link>

          <Link href="/admin/ranking" className="nav-chip nav-chip-primary">
            Ranking & Productivity
          </Link>
        </div>
      </div>

      {/* Mobile Slide-out Drawer */}
      <div
        className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-drawer-header">
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1f1815' }}>MENU</span>
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Menu"
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', background: '#f4efe6', padding: '0.75rem', borderRadius: '6px', border: '1px solid #dfd7cc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="online-dot" />
              <strong style={{ fontSize: '0.75rem', color: '#3b332e' }}>LOGGED IN</strong>
            </div>
            <div style={{ wordBreak: 'break-all', color: '#595048', fontSize: '0.8rem', fontWeight: 500 }}>{userEmail}</div>
          </div>

          <div className="mobile-links">
            <Link href="/admin/team" className="nav-chip" onClick={() => setMobileMenuOpen(false)}>
              Admins List
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                setShowAttendanceModal(true)
              }}
              className="nav-chip"
            >
              Attendance ({attendanceStatus === 'In' ? 'In' : 'Out'})
            </button>

            <Link href="/admin/settings" className="nav-chip" onClick={() => setMobileMenuOpen(false)}>
              Edit Profile
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                setShowNotifications(true)
              }}
              className="nav-chip"
            >
              Notifications
            </button>

            <Link href="/admin/chats" className="nav-chip" onClick={() => setMobileMenuOpen(false)}>
              Chats
            </Link>

            <Link href="/admin/ranking" className="nav-chip nav-chip-primary" onClick={() => setMobileMenuOpen(false)}>
              Ranking & Productivity
            </Link>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eae3d8' }}>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                onLogout()
              }}
              className="nav-chip logout-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#1f1815', fontWeight: 700 }}>Admin Attendance Tracker</h3>
            <p style={{ fontSize: '0.85rem', color: '#786f66', marginBottom: '1rem' }}>
              Status: <strong>{attendanceStatus === 'In' ? 'Clocked In' : 'Clocked Out'}</strong>
            </p>
            <button
              type="button"
              onClick={handleTimeToggle}
              style={{
                width: '100%',
                padding: '0.7rem',
                backgroundColor: attendanceStatus === 'Out' ? '#2e6930' : '#992222',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              Time {attendanceStatus === 'Out' ? 'In Now' : 'Out Now'}
            </button>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem', background: '#f7f4ef', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ebdfd3' }}>
              <strong style={{ color: '#3b332e' }}>Logs:</strong>
              {timeLogs.length === 0 ? (
                <div style={{ color: '#8c827a', marginTop: '0.25rem' }}>No clock events today.</div>
              ) : (
                timeLogs.map((log, i) => <div key={i} style={{ marginTop: '0.2rem', color: '#3b332e' }}>{log}</div>)
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAttendanceModal(false)}
              style={{ width: '100%', marginTop: '1.0rem', padding: '0.5rem', background: '#eae3d8', color: '#3b332e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: '#1f1815', fontWeight: 700 }}>Admin Notifications</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#3b332e', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>New order received.</li>
              <li>Inventory low stock alert updated.</li>
              <li>Monthly productivity metrics compiled.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              style={{ width: '100%', marginTop: '1.2rem', padding: '0.5rem', background: '#1f1815', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface AdminHeaderProps {
  title: string
  description?: string
  userEmail: string
  onLogout: () => void
  action?: React.ReactNode
}

export default function AdminHeader({
  title,
  description,
  userEmail,
  onLogout,
  action,
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
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
          gap: 0.75rem;
          width: 100%;
        }

        .admin-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-title-area h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1f1815;
          margin: 0 0 0.15rem 0;
          letter-spacing: -0.02em;
        }

        .admin-title-area p {
          font-size: 0.85rem;
          color: #786f66;
          margin: 0;
        }

        /* Online Identifier & Profile Info Panel */
        .admin-profile-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #faf8f5;
          border: 1px solid #e8e2d9;
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .online-dot {
          width: 8px;
          height: 8px;
          background-color: #275e27;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(39, 94, 39, 0.15);
          animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(39, 94, 39, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(39, 94, 39, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(39, 94, 39, 0); }
        }

        .admin-nav-links-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-top: 0.5rem;
          border-top: 1px solid #f2ede4;
        }

        .nav-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background-color: #ffffff;
          border: 1px solid #dcd5ca;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #3b332e;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .nav-chip:hover {
          background-color: #f7f4ef;
          border-color: #c0633b;
          color: #c0633b;
        }

        .nav-chip-primary {
          background-color: #1f1815;
          color: #ffffff;
          border-color: #1f1815;
        }

        .nav-chip-primary:hover {
          background-color: #3b332e;
          color: #ffffff;
        }

        .logout-btn {
          background-color: #fff8f8;
          color: #a82323;
          border-color: #f5c6c6;
        }

        .logout-btn:hover {
          background-color: #f5c6c6;
          color: #821b1b;
        }

        /* Modal Overlay for Attendance / Notifications */
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
        }

        .modal-card {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="admin-header-wrapper">
        {/* Top Row: Title, Description & Real User Credentials/Online Status */}
        <div className="admin-top-row">
          <div className="admin-title-area">
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Online Identifier & Gmail View */}
            <div className="admin-profile-badge">
              <span className="online-dot" title="Online Status Active" />
              <span style={{ fontWeight: 600, color: '#1f1815' }}>{userEmail}</span>
            </div>

            <button type="button" onClick={onLogout} className="nav-chip logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Feature Navigation Links Toolbar */}
        <div className="admin-nav-links-bar">
          <Link href="/admin/team" className="nav-chip">
            👥 Admin List
          </Link>

          <button type="button" onClick={() => setShowAttendanceModal(true)} className="nav-chip">
            🕒 Attendance ({attendanceStatus === 'In' ? 'Timed In' : 'Timed Out'})
          </button>

          <Link href="/admin/settings" className="nav-chip">
            ⚙️ Edit Profile
          </Link>

          <button type="button" onClick={() => setShowNotifications(!showNotifications)} className="nav-chip">
            🔔 Notifications <span style={{ background: '#c0633b', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '99px', fontSize: '0.65rem' }}>3</span>
          </button>

          <Link href="/admin/chats" className="nav-chip">
            💬 Chats
          </Link>

          <Link href="/admin/ranking" className="nav-chip nav-chip-primary">
            🏆 Admin Ranking & Productivity
          </Link>

          {/* Optional actions passed from page (like Print or Refresh) */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            {action}
          </div>
        </div>
      </div>

      {/* Attendance Modal Tracker */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1f1815' }}>Admin Attendance Tracker</h3>
            <p style={{ fontSize: '0.85rem', color: '#786f66', marginBottom: '1rem' }}>
              Current Status: <strong>{attendanceStatus === 'In' ? '🟢 Clocked In' : '🔴 Clocked Out'}</strong>
            </p>
            <button
              type="button"
              onClick={handleTimeToggle}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: attendanceStatus === 'Out' ? '#275e27' : '#a82323',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              Time {attendanceStatus === 'Out' ? 'In Now' : 'Out Now'}
            </button>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem', background: '#faf8f5', padding: '0.5rem', borderRadius: '6px' }}>
              <strong>Activity Logs:</strong>
              {timeLogs.length === 0 ? (
                <div style={{ color: '#8c827a', marginTop: '0.25rem' }}>No clock events recorded today.</div>
              ) : (
                timeLogs.map((log, i) => <div key={i} style={{ marginTop: '0.2rem' }}>{log}</div>)
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAttendanceModal(false)}
              style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: '#eee8e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notification Dropdown Drawer / Modal */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#1f1815' }}>Admin Notifications</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#3b332e', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>New order #3002463F placed ($1,027.34).</li>
              <li>Inventory low stock alert on 1 item.</li>
              <li>Monthly productivity report compiled successfully.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: '#1f1815', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

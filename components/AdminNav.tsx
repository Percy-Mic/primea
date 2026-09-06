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
        }

        .admin-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
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
          border-top: 1px solid #eae3d8;
        }

        .nav-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.75rem;
          background-color: #f7f4ef;
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
          background-color: #eee7dc;
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
          border-radius: 10px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          border: 1px solid #e8e2d9;
        }
      `}</style>

      <div className="admin-header-wrapper">
        <div className="admin-top-row">
          <div className="admin-title-area">
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="admin-profile-badge">
              <span className="online-dot" title="Online Status Active" />
              <span style={{ fontWeight: 600, color: '#1f1815' }}>{userEmail}</span>
            </div>

            <button type="button" onClick={onLogout} className="nav-chip logout-btn">
              Logout
            </button>
          </div>
        </div>

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
              style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: '#eae3d8', color: '#3b332e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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

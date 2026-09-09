'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AttendancePage() {
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeRecord, setActiveRecord] = useState<any>(null)
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    let channel: any

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch active record for this specific user
        const { data } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .is('time_out', null)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (data && data.length > 0) {
          setActiveRecord(data[0])
        }

        // Fetch user's attendance list
        fetchAttendance(user.id)

        // Setup real-time listener filtered for this user only
        channel = supabase
          .channel('attendance-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'attendance',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchAttendance(user.id)
            }
          )
          .subscribe()
      } else {
        setLoading(false)
      }
    }
    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // Modified to accept userId so it fetches only personal logs
  const fetchAttendance = async (userId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setAttendanceList(data)
    setLoading(false)
  }

  const handleTimeIn = async () => {
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const name = profile?.full_name || user.email

    const { data, error } = await supabase.from('attendance').insert([{
      user_id: user.id,
      user_name: name,
      status: 'Present',
      notes: notes || 'Clocked In'
    }]).select().single()

    if (!error && data) {
      setActiveRecord(data)
      setNotes('')
      await supabase.from('logged_actions').insert([{ admin_id: user.id, admin_name: name, action_name: 'Clocked In' }])
      fetchAttendance(user.id)
    }
  }

  const handleTimeOut = async () => {
    if (!activeRecord || !user) return

    const { error } = await supabase
      .from('attendance')
      .update({ time_out: new Date().toISOString() })
      .eq('id', activeRecord.id)

    if (!error) {
      setActiveRecord(null)
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      await supabase.from('logged_actions').insert([{ admin_id: user.id, admin_name: profile?.full_name || user.email, action_name: 'Clocked Out' }])
      fetchAttendance(user.id)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Group records by month (e.g., "September 2026")
  const groupedByMonth = attendanceList.reduce((acc: any, rec: any) => {
    const date = new Date(rec.time_in)
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!acc[monthYear]) {
      acc[monthYear] = []
    }
    acc[monthYear].push(rec)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .desktop-table { display: table !important; }
          .mobile-cards { display: none !important; }
        }
        @media (min-width: 640px) {
          .desktop-table { display: table !important; }
          .mobile-cards { display: none !important; }
        }
        @media (max-width: 639px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
        }
      `}} />

      {/* Top Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>My Attendance & Time Tracking</h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>Monitor your shifts and verify time logs grouped by month.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button onClick={handlePrint} style={{ padding: '0.5rem 0.9rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Print Report</button>
          <Link href="admin/dashboard" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>← Dashboard</Link>
        </div>
      </div>

      {/* Quick Actions Card */}
      {user && (
        <div className="no-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Shift Controls</h3>
          {activeRecord ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.88rem' }}>Clocked In at {new Date(activeRecord.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onClick={handleTimeOut} style={{ marginLeft: 'auto', padding: '0.45rem 1.1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Time Out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Shift notes (e.g., Remote, Office)..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1, minWidth: '180px', fontSize: '0.88rem', outline: 'none' }} />
              <button onClick={handleTimeIn} style={{ padding: '0.6rem 1.25rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>Time In</button>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="printable-area" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>My Attendance Logs & Proof Summary</h2>
          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Your organized monthly shift records.</p>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>Loading records...</div>
        ) : attendanceList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>No attendance records found.</div>
        ) : (
          Object.keys(groupedByMonth).map((monthYear) => (
            <div key={monthYear} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', borderLeft: '3px solid #2563eb' }}>
                {monthYear}
              </h3>

              {/* MOBILE VIEW: Stacked Cards per Month */}
              <div className="mobile-cards" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                {groupedByMonth[monthYear].map((rec: any) => (
                  <div key={rec.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', wordBreak: 'break-all' }}>{rec.user_name}</span>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '5px', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', fontWeight: 600, whiteSpace: 'nowrap' }}>{rec.status}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                      <div><strong>In:</strong> {new Date(rec.time_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      <div>
                        <strong>Out:</strong> {rec.time_out ? new Date(rec.time_out).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: '#d97706', fontWeight: 600 }}>Active Shift</span>}
                      </div>
                      {rec.notes && <div><strong>Notes:</strong> {rec.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP / PRINT VIEW: Clean Table per Month */}
              <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Status</th>
                    <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Time In</th>
                    <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Time Out</th>
                    <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByMonth[monthYear].map((rec: any) => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', background: '#dcfce7', color: '#166534', fontWeight: 600, display: 'inline-block' }}>{rec.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', color: '#334155' }}>{new Date(rec.time_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td style={{ padding: '0.75rem 0.85rem', color: '#334155' }}>
                        {rec.time_out ? new Date(rec.time_out).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: '#d97706', fontWeight: 600, background: '#fef3c7', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active Shift</span>}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', color: '#64748b' }}>{rec.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

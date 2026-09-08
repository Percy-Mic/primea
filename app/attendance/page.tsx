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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
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
      }

      fetchAttendance()
    }
    init()

    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        fetchAttendance()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchAttendance = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
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
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Top Navigation & Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Attendance & Time Tracking</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Monitor admin shifts, time-ins, and generate verification logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handlePrint} style={{ padding: '0.55rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Print Report</button>
          <Link href="admin/dashboard" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', padding: '0.55rem 0.85rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>← Dashboard</Link>
        </div>
      </div>

      {/* Quick Actions Card */}
      {user && (
        <div className="no-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Shift Controls</h3>
          {activeRecord ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>Clocked In at {new Date(activeRecord.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onClick={handleTimeOut} style={{ marginLeft: 'auto', padding: '0.5rem 1.25rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Time Out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Add shift notes (e.g. Remote work, Field task)..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1, minWidth: '200px', fontSize: '0.9rem', outline: 'none' }} />
              <button onClick={handleTimeIn} style={{ padding: '0.65rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Time In</button>
            </div>
          )}
        </div>
      )}

      {/* Attendance Table / Proof Summary */}
      <div className="printable-area" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Attendance Logs & Proof Summary</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Complete historical record of admin time-ins and time-outs.</p>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.87rem', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Admin / User</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Time In</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Time Out</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading records...</td></tr>
              ) : attendanceList.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No attendance records found.</td></tr>
              ) : (
                attendanceList.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.user_name}>
                      {rec.user_name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: '#dcfce7', color: '#166534', fontWeight: 600, display: 'inline-block' }}>{rec.status}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#334155' }}>{new Date(rec.time_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#334155' }}>
                      {rec.time_out ? new Date(rec.time_out).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: '#d97706', fontWeight: 500, background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active Shift</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.notes}>
                      {rec.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

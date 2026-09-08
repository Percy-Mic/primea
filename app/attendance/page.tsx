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
    <div style={{ maxWidth: '900px', margin: '1rem auto', padding: '1rem', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Header section optimized for wrapping on small screens */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Attendance & Time Tracking</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handlePrint} style={{ padding: '0.5rem 0.85rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Print Report</button>
          {/* Redirected to Admin Dashboard instead of storefront */}
          <Link href="/admin" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, alignSelf: 'center', fontSize: '0.85rem' }}>← Dashboard</Link>
        </div>
      </div>

      {user && (
        <div className="no-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem' }}>Quick Actions</h3>
          {activeRecord ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.85rem' }}>Clocked In at {new Date(activeRecord.time_in).toLocaleTimeString()}</span>
              <button onClick={handleTimeOut} style={{ padding: '0.45rem 0.85rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Time Out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Optional notes (e.g. Remote)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', flex: 1, minWidth: '150px', fontSize: '0.85rem' }} />
              <button onClick={handleTimeIn} style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Time In</button>
            </div>
          )}
        </div>
      )}

      <div className="printable-area" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Attendance Logs & Proof Summary</h2>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.65rem' }}>Admin / User</th>
                <th style={{ padding: '0.65rem' }}>Status</th>
                <th style={{ padding: '0.65rem' }}>Time In</th>
                <th style={{ padding: '0.65rem' }}>Time Out</th>
                <th style={{ padding: '0.65rem' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center' }}>Loading records...</td></tr>
              ) : attendanceList.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No attendance records.</td></tr>
              ) : (
                attendanceList.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 600, wordBreak: 'break-all' }}>{rec.user_name}</td>
                    <td style={{ padding: '0.65rem' }}>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>{rec.status}</span>
                    </td>
                    <td style={{ padding: '0.65rem', whiteSpace: 'nowrap' }}>{new Date(rec.time_in).toLocaleString()}</td>
                    <td style={{ padding: '0.65rem', whiteSpace: 'nowrap' }}>{rec.time_out ? new Date(rec.time_out).toLocaleString() : <span style={{ color: '#d97706' }}>Active</span>}</td>
                    <td style={{ padding: '0.65rem', color: '#64748b' }}>{rec.notes || '-'}</td>
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

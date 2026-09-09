'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function AdminProfileViewPage() {
  const params = useParams()
  const id = params?.id as string

  const [profile, setProfile] = useState<any>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()

    const fetchAdminData = async () => {
      setLoading(true)

      // Fetch target profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profileData) setProfile(profileData)

      // Fetch target admin's attendance logs
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      if (attendanceData) setAttendanceLogs(attendanceData)

      setLoading(false)
    }

    fetchAdminData()
  }, [id])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'sans-serif', color: '#64748b' }}>Loading admin details...</div>
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'sans-serif', color: '#64748b' }}>
        <h2>Admin not found.</h2>
        <Link href="/admin_list" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>← Back to Directory</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Admin Activity & Profile</h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>Detailed audit view for {profile.full_name || 'Admin'}.</p>
        </div>
        <Link href="/admin_list" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>← Directory</Link>
      </div>

      {/* Profile Card Summary */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#475569' }}>
            {profile.full_name?.[0] || 'A'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{profile.full_name || 'Unnamed Admin'}</h2>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>{profile.email}</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>{profile.role || 'Admin'}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Score: {profile.score || 0} pts</span>
          </div>
        </div>
      </div>

      {/* Attendance & Shift History */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Recent Shift History</h3>

        {attendanceLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>No attendance or shift records logged for this admin.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Time In</th>
                <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Time Out</th>
                <th style={{ padding: '0.7rem 0.85rem', fontWeight: 600, color: '#475569' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0.85rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>{log.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#334155' }}>{new Date(log.time_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#334155' }}>
                    {log.time_out ? new Date(log.time_out).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: '#d97706', fontWeight: 600 }}>Active</span>}
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#64748b' }}>{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

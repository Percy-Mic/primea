'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminListPage() {
  const [admins, setAdmins] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    const fetchAdmins = async () => {
      // Sort admins by productivity score descending
      const { data } = await supabase.from('profiles').select('*').order('score', { ascending: false })
      if (data) setAdmins(data)
    }
    fetchAdmins()

    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAdmins()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin Directory & Productivity Rankings</h1>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← Back Home</Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Rank & Admin</th>
              <th style={{ padding: '0.75rem 1rem' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Productivity Score</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No administrators listed.</td></tr>
            ) : (
              admins.map((admin, index) => (
                <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700, width: '20px', color: index === 0 ? '#d97706' : '#64748b' }}>#{index + 1}</span>
                    {admin.avatar_url ? (
                      <img src={admin.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{admin.full_name?.[0] || 'A'}</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{admin.full_name || 'Unnamed Admin'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>{admin.role}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                    {admin.score || 0} pts
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

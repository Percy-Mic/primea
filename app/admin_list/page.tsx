'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminListPage() {
  const [admins, setAdmins] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    const fetchAdmins = async () => {
      const { data } = await supabase.from('admins').select('*')
      if (data) setAdmins(data)
    }
    fetchAdmins()
  }, [])

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin List</h1>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← Back Home</Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
          {admins.length === 0 ? (
            <p style={{ color: '#64748b' }}>No admin users configured.</p>
          ) : (
            admins.map((admin) => (
              <li key={admin.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{admin.name || admin.email}</strong> — <span style={{ color: '#64748b' }}>{admin.role || 'Admin'}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

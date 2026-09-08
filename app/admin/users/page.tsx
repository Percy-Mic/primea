'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch only profiles where the role is explicitly 'admin'
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .order('full_name', { ascending: true })

        if (error) throw error
        setAdmins(data || [])
      } catch (err: any) {
        console.error('Error fetching admin roster:', err.message)
        setError('Failed to load administrator roster.')
      } finally {
        setLoading(false)
      }
    }

    fetchAdmins()
  }, [])

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8f6f0', color: '#1a1412', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <header style={{ background: '#120e0c', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a221f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: '#f8f6f0', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#8c7a70', fontSize: '0.8rem', borderLeft: '1px solid #2a221f', paddingLeft: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link href="/admin/profile" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>My Profile</Link>
          <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem 1.5rem' }}>
        
        {/* Title Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 700, color: '#1a1412' }}>Admin Roster</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6e5f57' }}>Oversee authorization tiers and manage team access permissions.</p>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Roster Table Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e6e1da', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6e5f57', fontSize: '0.9rem' }}>Loading administrators...</div>
          ) : admins.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6e5f57', fontSize: '0.9rem' }}>No administrator accounts found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#f3efe6', textAlign: 'left', borderBottom: '1px solid #e6e1da', color: '#4a3f39' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Administrator</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Rank Tier</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Department</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Job Title</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const displayName = admin.full_name || admin.email?.split('@')[0] || 'Unnamed Admin'
                    const initial = displayName.charAt(0).toUpperCase()
                    
                    return (
                      <tr key={admin.id} style={{ borderBottom: '1px solid #f8f6f0', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1a1412', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, overflow: 'hidden' }}>
                            {admin.avatar_url ? (
                              <img src={admin.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initial
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1a1412' }}>{displayName}</div>
                            <div style={{ fontSize: '0.78rem', color: '#6e5f57' }}>{admin.email}</div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ background: '#1a1412', color: '#d4af37', fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>
                            {admin.rank_tier ? admin.rank_tier.toUpperCase() : 'ADMIN'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#4a3f39' }}>{admin.department || 'Operations'}</td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ background: '#f0fff4', color: '#276749', fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #c6f6d5' }}>
                            ● {admin.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#4a3f39' }}>{admin.job_title || 'Store Manager'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

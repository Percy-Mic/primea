'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AddAdminModal from './AddAdminModal'

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchTeam = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (currentProfile) setCurrentUserRole(currentProfile.role)
    }

    const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (profilesData) setAdmins(profilesData)
    setLoading(false)
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8f6f0', color: '#1a1412', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Navigation Header */}
      <header style={{ background: '#120e0c', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a221f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: '#f8f6f0', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#8c7a70', fontSize: '0.8rem', borderLeft: '1px solid #2a221f', paddingLeft: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'none' }} className="desktop-label">Directory</span>
        </div>
        <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>← Dashboard</Link>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Title Action Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }} className="flex-responsive">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Admin Roster</h1>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', color: '#6e5f57' }}>Oversee authorization tiers and manage team access permissions.</p>
          </div>

          {(currentUserRole === 'CEO' || currentUserRole === 'Owner') && (
            <button 
              onClick={() => setShowAddModal(true)} 
              style={{ padding: '0.75rem 1.25rem', background: '#1a1412', color: '#d4af37', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,20,18,0.1)', width: 'fit-content' }}
            >
              + Add Administrator
            </button>
          )}
        </div>

        {/* Responsive Table Wrapper */}
        <div style={{ background: '#ffffff', border: '1px solid #e6e1da', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '650px' }}>
            <thead>
              <tr style={{ background: '#f3efe6', borderBottom: '1px solid #e6e1da', color: '#544640' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Administrator</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Rank Tier</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Role Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6e5f57' }}>Loading team members...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6e5f57' }}>No administrators registered.</td></tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} style={{ borderBottom: '1px solid #f3efe6' }}>
                    <td style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1a1412', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {adm.full_name?.[0] || 'A'}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: '#1a1412', textOverflow: 'ellipsis', overflow: 'hidden' }}>{adm.full_name || 'Unnamed'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6e5f57', textOverflow: 'ellipsis', overflow: 'hidden' }}>{adm.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', background: adm.role === 'CEO' ? '#1a1412' : '#f3efe6', color: adm.role === 'CEO' ? '#d4af37' : '#1a1412', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                        {adm.role?.toUpperCase() || 'STAFF'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#4a3f39' }}>{adm.department || 'Operations'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: '#276749', background: '#f0fff4', border: '1px solid #c6f6d5', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ● {adm.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#6e5f57', fontSize: '0.85rem' }}>{adm.job_title || 'Store Manager'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>

      {showAddModal && <AddAdminModal onClose={() => setShowAddModal(false)} onAdminAdded={fetchTeam} />}
    </div>
  )
}

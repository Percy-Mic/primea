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
    <div style={{ width: '100%', minHeight: '100vh', background: '#f5f2eb', color: '#2c221e', fontFamily: 'system-ui, sans-serif', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div style={{ width: '100%', background: '#1e1614', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3a2e2b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#f5f2eb', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#c5b8af', fontSize: '0.85rem', borderLeft: '1px solid #3a2e2b', paddingLeft: '1.5rem', textTransform: 'uppercase' }}>Admin Team Directory</span>
        </div>
        <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>← Return to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Administrator Roster & Ranks</h1>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: '#7a6b63' }}>Manage system access tiers and onboard new managers or staff.</p>
          </div>

          {(currentUserRole === 'CEO' || currentUserRole === 'Owner') && (
            <button 
              onClick={() => setShowAddModal(true)} 
              style={{ padding: '0.75rem 1.5rem', background: '#2c221e', color: '#d4af37', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(44,34,30,0.15)' }}
            >
              + Add New Admin
            </button>
          )}
        </div>

        {/* Admins Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f2eb', borderBottom: '1px solid #e3ded6', color: '#4a3b35' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Administrator</th>
                <th style={{ padding: '1rem' }}>Rank Tier</th>
                <th style={{ padding: '1rem' }}>Department</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem' }}>Job Title</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#7a6b63' }}>Loading directory...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#7a6b63' }}>No administrators found.</td></tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} style={{ borderBottom: '1px solid #f9f8f6' }}>
                    <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2c221e', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                        {adm.full_name?.[0] || 'A'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{adm.full_name || 'Unnamed Admin'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#7a6b63' }}>{adm.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', background: adm.role === 'CEO' ? '#2c221e' : '#f5f2eb', color: adm.role === 'CEO' ? '#d4af37' : '#2c221e', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        {adm.role?.toUpperCase() || 'STAFF'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#4a3b35' }}>{adm.department || 'Operations'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: '#276749', background: '#f0fff4', border: '1px solid #c6f6d5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ● {adm.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#7a6b63' }}>{adm.jobTitle || adm.job_title || 'Store Manager'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {showAddModal && <AddAdminModal onClose={() => setShowAddModal(false)} onAdminAdded={fetchTeam} />}
    </div>
  )
}

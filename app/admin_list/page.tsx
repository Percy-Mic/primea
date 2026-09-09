'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminListPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')

  useEffect(() => {
    const supabase = createClient()
    
    const fetchAdmins = async () => {
      setLoading(true)
      // Filter strictly for admin roles based on your Supabase column
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
      
      if (data) setAdmins(data)
      if (error) console.error('Error fetching admin profiles:', error)
      setLoading(false)
    }

    fetchAdmins()

    const channel = supabase
      .channel('profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchAdmins()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredAdmins = useMemo(() => {
    let result = [...admins]

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (admin) =>
          admin.full_name?.toLowerCase().includes(query) ||
          admin.email?.toLowerCase().includes(query)
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0)
      } else {
        const nameA = a.full_name || ''
        const nameB = b.full_name || ''
        return nameA.localeCompare(nameB)
      }
    })

    return result
  }, [admins, searchQuery, sortBy])

  const totalAdmins = admins.length
  const totalPoints = admins.reduce((acc, curr) => acc + (curr.score || 0), 0)
  const topScore = admins.length > 0 ? Math.max(...admins.map(a => a.score || 0)) : 0

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 640px) {
          .desktop-table { display: table !important; }
          .mobile-cards { display: none !important; }
        }
        @media (max-width: 639px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
        }
      `}} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Admin Directory & Productivity Rankings</h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>Live view of administrative performance scores and team stats.</p>
        </div>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>← Back Home</Link>
      </div>

      {/* Stats Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Admins</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{totalAdmins}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Combined Points</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>{totalPoints.toLocaleString()}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Top Score</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>{topScore} pts</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          style={{ padding: '0.6rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1, minWidth: '220px', fontSize: '0.88rem', outline: 'none', background: '#fff' }} 
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'score' | 'name')}
            style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', background: '#fff', color: '#1e293b', fontWeight: 500 }}
          >
            <option value="score">Score (High to Low)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>Loading directory...</div>
        ) : filteredAdmins.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>No matching administrators found.</div>
        ) : (
          <>
            {/* MOBILE VIEW */}
            <div className="mobile-cards" style={{ flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              {filteredAdmins.map((admin, index) => {
                const isTop1 = sortBy === 'score' && index === 0
                return (
                  <div key={admin.id} style={{ 
                    background: isTop1 ? '#fffbeb' : '#f8fafc', 
                    border: `1px solid ${isTop1 ? '#fde68a' : '#e2e8f0'}`, 
                    borderRadius: '10px', 
                    padding: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isTop1 ? '#d97706' : '#64748b', width: '24px' }}>
                          {sortBy === 'score' ? `#${index + 1}` : '•'}
                        </span>
                        {admin.avatar_url ? (
                          <img src={admin.avatar_url} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                            {admin.full_name?.[0] || 'A'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{admin.full_name || 'Unnamed Admin'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>{admin.email}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{admin.score || 0} pts</span>
                      <Link href={`/admin/profile/${admin.id}`} style={{ padding: '0.35rem 0.75rem', background: '#2563eb', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>View Profile</Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP VIEW */}
            <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Rank & Admin</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Score & Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin, index) => {
                  const isTop1 = sortBy === 'score' && index === 0
                  return (
                    <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9', background: isTop1 ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 700, width: '24px', color: isTop1 ? '#d97706' : '#64748b' }}>
                            {sortBy === 'score' ? `#${index + 1}` : '•'}
                          </span>
                          {admin.avatar_url ? (
                            <img src={admin.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#475569', flexShrink: 0 }}>
                              {admin.full_name?.[0] || 'A'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{admin.full_name || 'Unnamed Admin'} {isTop1 && '👑'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, display: 'inline-block' }}>{admin.role || 'Admin'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{admin.score || 0} pts</span>
                          <Link href={`/admin/profile/${admin.id}`} style={{ padding: '0.35rem 0.75rem', background: '#2563eb', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>Stalk Profile</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

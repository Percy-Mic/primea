'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Selected Order for Detail Modal view
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Real Dynamic Metrics
  const [metrics, setMetrics] = useState({
    completedOrders: 0,
    activeProducts: 0,
    totalRevenue: 0,
    loading: true
  })

  // Real Database Activity Log
  const [activityLog, setActivityLog] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      // Fetch profile details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setFullName(profileData.full_name || '')
        setBio(profileData.bio || '')
        if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url)
        if (profileData.updated_at) {
          setUpdatedAt(new Date(profileData.updated_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }))
        }
      }

      // Fetch LIVE metrics and orders from Supabase tables
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })

        let completedCount = 0
        let revenueSum = 0
        let logs: any[] = []

        if (ordersData && !ordersError) {
          ordersData.forEach((order: any) => {
            const status = (order.status || order.total_amo_status || '').toLowerCase()
            if (status === 'completed' || status === 'delivered' || status === 'complete') {
              completedCount++
            }
            const amt = Number(order.total_amount || order.total_amo || 0)
            revenueSum += isNaN(amt) ? 0 : amt

            logs.push({
              id: order.id,
              title: `Order #${order.id?.slice(0, 8) || 'Transaction'} Processed`,
              time: order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent database event',
              type: 'ORDER',
              raw: order
            })
          })
        }

        setMetrics({
          completedOrders: completedCount,
          activeProducts: productCount || 0,
          totalRevenue: revenueSum,
          loading: false
        })

        setActivityLog(logs) 
      } catch (err) {
        console.error('Error fetching live database metrics:', err)
        setMetrics(prev => ({ ...prev, loading: false }))
      }

      setLoading(false)
    }

    fetchAdminData()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage({ text: '', type: '' })

      if (!user) throw new Error('User session not loaded yet.')
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const localPreviewUrl = URL.createObjectURL(file)
      setAvatarUrl(localPreviewUrl)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      if (data?.publicUrl) setAvatarUrl(data.publicUrl)

      setMessage({ text: 'Avatar uploaded successfully.', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Error uploading file.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage({ text: '', type: '' })

    const now = new Date().toISOString()
    const updates: any = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      bio: bio,
      updated_at: now,
    }

    if (avatarUrl) updates.avatar_url = avatarUrl

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile updated successfully in Supabase.', type: 'success' })
      setUpdatedAt(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f5f2eb', color: '#2c221e', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      
      {/* Top Header Bar */}
      <div style={{ width: '100%', background: '#1e1614', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3a2e2b', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#f5f2eb', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px' }}>STORE ADMIN</span>
          <span style={{ color: '#c5b8af', fontSize: '0.85rem', borderLeft: '1px solid #3a2e2b', paddingLeft: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Executive Profile Hub</span>
        </div>
        <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Return to Dashboard
        </Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem', boxSizing: 'border-box' }}>
        
        {/* Profile Banner */}
        <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(44,34,30,0.04)', marginBottom: '2rem' }}>
          <div style={{ height: '160px', background: 'linear-gradient(135deg, #2c221e 0%, #4a3b35 100%)', padding: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-40px', left: '2.5rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
              <div style={{ width: '104px', height: '104px', borderRadius: '50%', background: '#fff', padding: '4px', boxShadow: '0 6px 20px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f5f2eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Admin Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4a3b35' }}>
                      {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.1)', color: '#f5f2eb', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(4px)' }}
              >
                Edit Profile
              </button>
            )}
          </div>

          <div style={{ padding: '3rem 2.5rem 1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#1e1614' }}>{fullName || 'Admin User'}</h1>
                <span style={{ background: '#2c221e', color: '#d4af37', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '1px' }}>ADMINISTRATOR</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a6b63' }}>{user?.email || 'Loading session...'}</p>
            </div>

            {/* Live Metrics Card */}
            <div style={{ display: 'flex', gap: '1.5rem', background: '#f5f2eb', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Completed Orders</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c221e' }}>{metrics.loading ? '...' : metrics.completedOrders}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Active Products</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c221e' }}>{metrics.loading ? '...' : metrics.activeProducts}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Store Revenue</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#276749' }}>${metrics.totalRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', borderTop: '1px solid #e3ded6', padding: '0 2.5rem', background: '#faf8f5' }}>
            {[
              { id: 'overview', label: 'Profile Overview' },
              { id: 'activity', label: 'Activity Log' },
              { id: 'security', label: 'Security & Session' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 1.5rem', background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #2c221e' : '2px solid transparent',
                  color: activeTab === tab.id ? '#2c221e' : '#7a6b63',
                  fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {message.text && (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', background: message.type === 'error' ? '#fff5f5' : '#f0fff4', color: message.type === 'error' ? '#c53030' : '#276749', border: `1px solid ${message.type === 'error' ? '#feb2b2' : '#c6f6d5'}` }}>
            {message.text}
          </div>
        )}

        {/* CONTENT LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
            
            {activeTab === 'overview' && (
              <div>
                {!isEditing ? (
                  <div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>About Administrator</h3>
                    <p style={{ margin: '0 0 2rem 0', fontSize: '0.95rem', color: '#4a3b35', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {bio || 'Primary store administrator managing customer orders, catalog items, and secure database pathways.'}
                    </p>

                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>Quick Actions</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1rem' }}>
                      <div style={{ background: '#f5f2eb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#2c221e' }}>Manage Store Inventory</div>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#7a6b63' }}>Review items, update catalog pricing, and track live database stock.</p>
                        <Link href="/admin/dashboard" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2c221e', textDecoration: 'none' }}>Open Dashboard →</Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Edit Profile Settings</h3>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Profile Picture Upload</label>
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Full Legal Name</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', background: '#f9f8f6', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Admin Bio</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={300} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', background: '#f9f8f6', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>{loading ? 'Saving...' : 'Save Profile'}</button>
                      <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.5rem', background: '#e3ded6', color: '#2c221e', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Activity Audit Stream</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Click any database entry to open full parameters and payload records.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activityLog.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: '#7a6b63' }}>No database activity recorded yet.</p>
                  ) : (
                    activityLog.map((act, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedOrder(act.raw)}
                        style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '10px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2c221e' }}>{act.title}</div>
                          <div style={{ fontSize: '0.78rem', color: '#7a6b63', marginTop: '0.2rem' }}>{act.time}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.7rem', background: '#e3ded6', borderRadius: '4px', color: '#2c221e' }}>VIEW DATA →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Authentication & Security State</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Your session keys are fully secured via Supabase encrypted architecture.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: '#4a3b35' }}>
                  <div style={{ padding: '0.75rem 1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Primary Admin Email</span>
                    <strong>{user?.email || 'Loading...'}</strong>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Session Security Status</span>
                    <strong style={{ color: '#276749' }}>Active & Secure</strong>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar Utility Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>Quick Navigation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/admin/dashboard" style={{ display: 'block', width: '100%', padding: '0.65rem', background: '#f5f2eb', color: '#2c221e', border: '1px solid #e3ded6', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
                  Open Dashboard
                </Link>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>System Sync</h4>
              <div style={{ fontSize: '0.83rem', color: '#7a6b63', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last Sync:</span>
                  <strong style={{ color: '#2c221e' }}>{updatedAt || 'Just now'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Database Link:</span>
                  <strong style={{ color: '#276749' }}>Connected</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Order Details Modal Popup */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e3ded6', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e1614' }}>Order Data Inspection</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', color: '#7a6b63' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: '#4a3b35', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f5f2eb' }}>
                <span style={{ color: '#7a6b63' }}>Order ID:</span>
                <strong style={{ color: '#1e1614' }}>{selectedOrder.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f5f2eb' }}>
                <span style={{ color: '#7a6b63' }}>Status:</span>
                <strong style={{ color: '#276749' }}>{selectedOrder.status || selectedOrder.total_amo_status || 'Pending'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f5f2eb' }}>
                <span style={{ color: '#7a6b63' }}>Total Amount:</span>
                <strong style={{ color: '#1e1614' }}>${selectedOrder.total_amount || selectedOrder.total_amo || '0.00'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f5f2eb' }}>
                <span style={{ color: '#7a6b63' }}>Timestamp:</span>
                <strong style={{ color: '#1e1614' }}>{new Date(selectedOrder.created_at).toLocaleString()}</strong>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1614', marginBottom: '0.5rem' }}>Raw Payload Stream</h4>
            <pre style={{ background: '#f5f2eb', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', color: '#2c221e', margin: 0 }}>
              {JSON.stringify(selectedOrder, null, 2)}
            </pre>

            <button onClick={() => setSelectedOrder(null)} style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Close View
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

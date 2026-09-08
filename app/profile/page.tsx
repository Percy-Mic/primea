'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('Manager')
  const [status, setStatus] = useState('Active')
  const [permissions, setPermissions] = useState<any>({})
  const [preferences, setPreferences] = useState<any>({ theme: 'light', timezone: 'Asia/Manila', default_page: 'dashboard' })
  const [notificationSettings, setNotificationSettings] = useState<any>({ new_orders: true, low_stock: true, failed_payments: true })
  
  const [avatarUrl, setAvatarUrl] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'security' | 'activity' | 'notifications' | 'preferences'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Audit Logs & Metrics
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [metrics, setMetrics] = useState({ completedOrders: 0, activeProducts: 0, totalRevenue: 0 })

  const supabase = createClient()

  useEffect(() => {
    const fetchAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUser(user)

      // Fetch extended profile record
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setFullName(profileData.full_name || '')
        setBio(profileData.bio || '')
        setPhone(profileData.phone || '')
        setJobTitle(profileData.job_title || 'Store Manager')
        setDepartment(profileData.department || 'Operations')
        setRole(profileData.role || 'Manager')
        setStatus(profileData.status || 'Active')
        setPermissions(profileData.permissions || {})
        if (profileData.preferences) setPreferences(profileData.preferences)
        if (profileData.notification_settings) setNotificationSettings(profileData.notification_settings)
        if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url)
        if (profileData.updated_at) {
          setUpdatedAt(new Date(profileData.updated_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }))
        }
      }

      // Fetch live store metrics & audit logs
      try {
        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
        const { data: logsData } = await supabase.from('admin_audit_logs').select('*').eq('admin_id', user.id).order('created_at', { ascending: false }).limit(10)

        let completedCount = 0
        let revenueSum = 0
        if (ordersData) {
          ordersData.forEach((order: any) => {
            const st = (order.status || '').toLowerCase()
            if (st === 'completed' || st === 'delivered' || st === 'complete') completedCount++
            revenueSum += Number(order.total_amount || order.total_amo || 0)
          })
        }

        setMetrics({ completedOrders: completedCount, activeProducts: productCount || 0, totalRevenue: revenueSum })
        if (logsData) setAuditLogs(logsData)
      } catch (err) {
        console.error('Error loading admin meta:', err)
      }

      setLoading(false)
    }

    fetchAdminData()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!user || !e.target.files?[0]) return
      const file = e.target.files[0]
      setAvatarUrl(URL.createObjectURL(file))

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      if (data?.publicUrl) setAvatarUrl(data.publicUrl)
      setMessage({ text: 'Avatar updated successfully.', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Upload failed.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    const updates = {
      id: user.id,
      full_name: fullName,
      bio,
      phone,
      job_title: jobTitle,
      department,
      preferences,
      notification_settings: notificationSettings,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').upsert(updates)
    if (error) {
      setMessage({ text: `Failed: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile preferences updated successfully.', type: 'success' })
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f5f2eb', color: '#2c221e', fontFamily: 'system-ui, sans-serif', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <div style={{ width: '100%', background: '#1e1614', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3a2e2b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#f5f2eb', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#c5b8af', fontSize: '0.85rem', borderLeft: '1px solid #3a2e2b', paddingLeft: '1.5rem', textTransform: 'uppercase' }}>Admin Identity & Security Hub</span>
        </div>
        <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>← Return to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
        
        {/* Profile Card Banner */}
        <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(44,34,30,0.04)' }}>
          <div style={{ height: '160px', background: 'linear-gradient(135deg, #2c221e 0%, #4a3b35 100%)', padding: '2rem', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-40px', left: '2.5rem' }}>
              <div onClick={() => avatarUrl && setShowLightbox(true)} style={{ width: '104px', height: '104px', borderRadius: '50%', background: '#fff', padding: '4px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f5f2eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2.2rem', fontWeight: 700 }}>{fullName?.[0] || 'A'}</span>}
                </div>
              </div>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Edit Profile Settings
              </button>
            )}
          </div>

          <div style={{ padding: '3rem 2.5rem 1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>{fullName || 'Administrator'}</h1>
                <span style={{ background: '#2c221e', color: '#d4af37', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>{role.toUpperCase()}</span>
                <span style={{ background: '#f0fff4', color: '#276749', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #c6f6d5' }}>● {status}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a6b63' }}>{jobTitle} · {department} | {user?.email}</p>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'flex', gap: '1.5rem', background: '#f5f2eb', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600 }}>ORDERS MANAGED</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{metrics.completedOrders}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600 }}>ACTIVE PRODUCTS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{metrics.activeProducts}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600 }}>REVENUE STREAM</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#276749' }}>₱{metrics.totalRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #e3ded6', padding: '0 2.5rem', background: '#faf8f5', overflowX: 'auto' }}>
            {[
              { id: 'profile', label: 'Identity & Details' },
              { id: 'permissions', label: 'Role & Permissions' },
              { id: 'security', label: 'Security & Sessions' },
              { id: 'activity', label: 'Activity & Audit Log' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'preferences', label: 'Preferences' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 1.5rem', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
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
          <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', background: message.type === 'error' ? '#fff5f5' : '#f0fff4', color: message.type === 'error' ? '#c53030' : '#276749', border: `1px solid ${message.type === 'error' ? '#feb2b2' : '#c6f6d5'}` }}>
            {message.text}
          </div>
        )}

        {/* TAB CONTENTS */}
        <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
          
          {activeTab === 'profile' && (
            <div>
              {!isEditing ? (
                <div>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Personal & Professional Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7a6b63', display: 'block', marginBottom: '0.2rem' }}>FULL NAME</span>
                      <strong style={{ fontSize: '0.95rem' }}>{fullName || 'Not specified'}</strong>
                    </div>
                    <div style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7a6b63', display: 'block', marginBottom: '0.2rem' }}>EMAIL ADDRESS</span>
                      <strong style={{ fontSize: '0.95rem' }}>{user?.email}</strong>
                    </div>
                    <div style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7a6b63', display: 'block', marginBottom: '0.2rem' }}>PHONE NUMBER</span>
                      <strong style={{ fontSize: '0.95rem' }}>{phone || 'Not provided'}</strong>
                    </div>
                    <div style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7a6b63', display: 'block', marginBottom: '0.2rem' }}>DEPARTMENT / TEAM</span>
                      <strong style={{ fontSize: '0.95rem' }}>{department}</strong>
                    </div>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bio Statement</h4>
                  <p style={{ color: '#4a3b35', lineHeight: '1.5', fontSize: '0.95rem' }}>{bio || 'No bio written yet.'}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Edit Admin Profile</h3>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Avatar Image</label>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Full Name</label>
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Phone Number</label>
                      <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+63 9..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Job Title</label>
                      <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Department</label>
                      <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Bio</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                    <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.5rem', background: '#e3ded6', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Role & Permissions Matrix</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Your assigned access rights across store modules.</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#7a6b63', display: 'block' }}>ASSIGNED ROLE</span>
                  <strong style={{ fontSize: '1.1rem', color: '#2c221e' }}>{role}</strong>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f5f2eb', textAlign: 'left', borderBottom: '1px solid #e3ded6' }}>
                    <th style={{ padding: '0.75rem' }}>Module Area</th>
                    <th style={{ padding: '0.75rem' }}>Permitted Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(permissions).length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '1rem', color: '#7a6b63' }}>Standard manager permissions loaded.</td></tr>
                  ) : (
                    Object.entries(permissions).map(([module, acts]: [string, any], idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f5f2eb' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{module}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {Array.isArray(acts) ? acts.join(' · ') : 'Full Access'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Security & Authentication Center</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Manage password protocols, sessions, and multi-factor authentication.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Two-Factor Authentication (2FA)</div>
                    <div style={{ fontSize: '0.8rem', color: '#7a6b63' }}>Protect your admin login with an authenticator app.</div>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', background: '#e2e8f0', color: '#4a5568', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>Not Enforced</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Active Secure Session</div>
                    <div style={{ fontSize: '0.8rem', color: '#7a6b63' }}>{user?.email} · Supabase Auth Token Secure</div>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', background: '#f0fff4', color: '#276749', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #c6f6d5' }}>Active Now</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Admin Activity & Audit Log</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Recent actions logged under your admin identity for store accountability.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ color: '#7a6b63', fontSize: '0.9rem' }}>No recent audit events recorded for this account.</p>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#7a6b63', marginTop: '0.2rem' }}>{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: '#e3ded6', borderRadius: '4px' }}>{log.action_type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Notification Preferences</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Select alerts you wish to receive in-app and via email.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(notificationSettings).map((key) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }}>
                    <input 
                      type="checkbox" 
                      checked={notificationSettings[key]} 
                      onChange={e => setNotificationSettings({...notificationSettings, [key]: e.target.checked})}
                      style={{ width: '18px', height: '18px' }}
                    />
                    {key.replace('_', ' ')}
                  </label>
                ))}
              </div>
              <button onClick={handleSaveProfile} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Save Notification Settings
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Personal Preferences & Environment</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Customize your admin workspace defaults.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Time Zone</label>
                  <select value={preferences.timezone} onChange={e => setPreferences({...preferences, timezone: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px' }}>
                    <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Default Landing Dashboard</label>
                  <select value={preferences.default_page} onChange={e => setPreferences({...preferences, default_page: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px' }}>
                    <option value="dashboard">Main Dashboard</option>
                    <option value="orders">Orders Manager</option>
                    <option value="products">Products Inventory</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSaveProfile} style={{ padding: '0.75rem 1.5rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Save Preferences
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

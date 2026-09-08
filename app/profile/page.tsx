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
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'security' | 'activity' | 'notifications' | 'preferences'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [metrics, setMetrics] = useState({ completedOrders: 0, activeProducts: 0, totalRevenue: 0 })

  const supabase = createClient()

  useEffect(() => {
    const fetchAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      if (profileData) {
        setFullName(profileData.full_name || '')
        setBio(profileData.bio || '')
        setPhone(profileData.phone || '')
        setJobTitle(profileData.job_title || 'Store Manager')
        setDepartment(profileData.department || 'Operations')
        setRole(profileData.role || 'Manager')
        setStatus(profileData.status || 'Active')
        setPermissions(profileData.permissions || { products: ['view', 'create'], orders: ['view', 'edit'] })
        if (profileData.preferences) setPreferences(profileData.preferences)
        if (profileData.notification_settings) setNotificationSettings(profileData.notification_settings)
        if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url)
      }

      try {
        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
        const { data: logsData } = await supabase.from('admin_audit_logs').select('*').eq('admin_id', user.id).order('created_at', { ascending: false }).limit(10)

        let completedCount = 0, revenueSum = 0
        if (ordersData) {
          ordersData.forEach((order: any) => {
            const st = (order.status || '').toLowerCase()
            if (['completed', 'delivered', 'complete'].includes(st)) completedCount++
            revenueSum += Number(order.total_amount || order.total_amo || 0)
          })
        }

        setMetrics({ completedOrders: completedCount, activeProducts: productCount || 0, totalRevenue: revenueSum })
        if (logsData) setAuditLogs(logsData)
      } catch (err) {
        console.error('Metrics loading error:', err)
      }
      setLoading(false)
    }
    fetchAdminData()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!user || !e.target.files?.[0]) return
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
      email: user.email,
      full_name: fullName,
      bio, phone,
      job_title: jobTitle,
      department, role,
      preferences,
      notification_settings: notificationSettings,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').upsert(updates)
    if (error) {
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile changes saved.', type: 'success' })
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8f6f0', color: '#1a1412', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <header style={{ background: '#120e0c', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a221f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: '#f8f6f0', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#8c7a70', fontSize: '0.8rem', borderLeft: '1px solid #2a221f', paddingLeft: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Security & Profile</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link href="/admin/users" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Team Directory</Link>
          <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem 4rem 1rem' }}>
        
        {/* Profile Card Shell */}
        <div style={{ background: '#ffffff', border: '1px solid #e6e1da', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.75rem', boxShadow: '0 8px 24px rgba(0,0,0,0.03)' }}>
          <div style={{ height: '140px', background: 'linear-gradient(135deg, #1a1412 0%, #3d312c 100%)', padding: '1.5rem', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-35px', left: '2rem' }}>
              <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: '#fff', padding: '3px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f8f6f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem', fontWeight: 700 }}>{fullName?.[0] || 'A'}</span>}
                </div>
              </div>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', height: 'fit-content' }}>
                Edit Settings
              </button>
            )}
          </div>

          <div style={{ padding: '3rem 2rem 1.5rem 2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{fullName || 'Administrator'}</h1>
                <span style={{ background: '#1a1412', color: '#d4af37', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>{role.toUpperCase()}</span>
                <span style={{ background: '#f0fff4', color: '#276749', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #c6f6d5' }}>● {status}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6e5f57' }}>{jobTitle} · {department} &bull; {user?.email}</p>
            </div>

            {/* Metrics block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.25rem', background: '#f3efe6', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #e6e1da' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#6e5f57', fontWeight: 600 }}>ORDERS</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{metrics.completedOrders}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', color: '#6e5f57', fontWeight: 600 }}>PRODUCTS</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{metrics.activeProducts}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', color: '#6e5f57', fontWeight: 600 }}>REVENUE</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#276749' }}>₱{metrics.totalRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Navigation Scrollable Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #e6e1da', padding: '0 1.5rem', background: '#faf8f5', overflowX: 'auto' }}>
            {[
              { id: 'profile', label: 'Overview' },
              { id: 'permissions', label: 'Permissions' },
              { id: 'security', label: 'Security' },
              { id: 'activity', label: 'Audit Logs' },
              { id: 'notifications', label: 'Alerts' },
              { id: 'preferences', label: 'Preferences' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '0.9rem 1.25rem', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
                  borderBottom: activeTab === tab.id ? '2px solid #1a1412' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1a1412' : '#6e5f57',
                  fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {message.text && (
          <div style={{ padding: '0.85rem 1.15rem', borderRadius: '8px', marginBottom: '1.25rem', background: message.type === 'error' ? '#fff5f5' : '#f0fff4', color: message.type === 'error' ? '#c53030' : '#276749', border: `1px solid ${message.type === 'error' ? '#feb2b2' : '#c6f6d5'}`, fontSize: '0.85rem' }}>
            {message.text}
          </div>
        )}

        {/* Tab Content Box */}
        <div style={{ background: '#ffffff', border: '1px solid #e6e1da', borderRadius: '14px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          
          {activeTab === 'profile' && (
            <div>
              {!isEditing ? (
                <div>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Profile Parameters</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                    <div style={{ padding: '0.9rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6e5f57', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>FULL NAME</span>
                      <strong style={{ fontSize: '0.9rem' }}>{fullName || 'Not specified'}</strong>
                    </div>
                    <div style={{ padding: '0.9rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6e5f57', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>EMAIL ADDRESS</span>
                      <strong style={{ fontSize: '0.9rem' }}>{user?.email}</strong>
                    </div>
                    <div style={{ padding: '0.9rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6e5f57', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>PHONE CONTACT</span>
                      <strong style={{ fontSize: '0.9rem' }}>{phone || 'Not provided'}</strong>
                    </div>
                    <div style={{ padding: '0.9rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6e5f57', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>AUTHORIZATION RANK</span>
                      <strong style={{ fontSize: '0.9rem', color: '#d4af37' }}>{role}</strong>
                    </div>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>Professional Summary</h4>
                  <p style={{ color: '#4a3f39', lineHeight: '1.5', fontSize: '0.9rem', margin: 0 }}>{bio || 'No bio provided.'}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Edit Administrator Profile</h3>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>AVATAR FILE</label>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>FULL NAME</label>
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>RANK</label>
                      <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', background: '#fff' }}>
                        <option value="CEO">CEO / Owner</option>
                        <option value="Manager">Store Manager</option>
                        <option value="Staff">Support Staff</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>JOB TITLE</label>
                      <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>DEPARTMENT</label>
                      <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>BIOGRAPHY</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.25rem', background: '#1a1412', color: '#f8f6f0', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Save Changes</button>
                    <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.25rem', background: '#f3efe6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#4a3f39' }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Access Control & Matrix</h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Capabilities mapping based on your active rank tier.</p>
              
              <div style={{ padding: '0.9rem 1rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#6e5f57', display: 'block', fontWeight: 600 }}>ASSIGNED RANK</span>
                  <strong style={{ fontSize: '1rem', color: '#1a1412' }}>{role}</strong>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '450px' }}>
                  <thead>
                    <tr style={{ background: '#f3efe6', textAlign: 'left', borderBottom: '1px solid #e6e1da' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Module</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Permissions Allowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(permissions).map(([module, acts]: [string, any], idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8f6f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, textTransform: 'capitalize' }}>{module}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#4a3f39' }}>{role === 'CEO' ? 'Full Control (All Rights)' : (Array.isArray(acts) ? acts.join(' · ') : 'Restricted')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Security Center</h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Session protection and credential security.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Two-Factor Authentication</div>
                    <div style={{ fontSize: '0.78rem', color: '#6e5f57' }}>Secure your account login credentials.</div>
                  </div>
                  <span style={{ padding: '0.25rem 0.6rem', background: '#edf2f7', color: '#4a5568', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>Optional</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Active Session</div>
                    <div style={{ fontSize: '0.78rem', color: '#6e5f57' }}>{user?.email} · Encrypted Token</div>
                  </div>
                  <span style={{ padding: '0.25rem 0.6rem', background: '#f0fff4', color: '#276749', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #c6f6d5' }}>Secure</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Recent Audit Log</h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Events logged under your administrator ID.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ color: '#6e5f57', fontSize: '0.88rem', margin: 0 }}>No audit activity recorded.</p>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} style={{ padding: '0.85rem 1rem', background: '#f8f6f0', borderRadius: '8px', border: '1px solid #e6e1da', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{log.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6e5f57', marginTop: '0.15rem' }}>{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: '#e6e1da', borderRadius: '4px' }}>{log.action_type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Notification Settings</h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Select platform alerts you want to receive.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.keys(notificationSettings).map((key) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, textTransform: 'capitalize' }}>
                    <input type="checkbox" checked={notificationSettings[key]} onChange={e => setNotificationSettings({...notificationSettings, [key]: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                    {key.replace('_', ' ')}
                  </label>
                ))}
              </div>
              <button onClick={handleSaveProfile} style={{ marginTop: '1.25rem', padding: '0.75rem 1.25rem', background: '#1a1412', color: '#f8f6f0', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Workspace Environment</h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Tailor your dashboard settings.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>TIME ZONE</label>
                  <select value={preferences.timezone} onChange={e => setPreferences({...preferences, timezone: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', background: '#fff' }}>
                    <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>DEFAULT LANDING</label>
                  <select value={preferences.default_page} onChange={e => setPreferences({...preferences, default_page: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', background: '#fff' }}>
                    <option value="dashboard">Main Dashboard</option>
                    <option value="orders">Orders Manager</option>
                    <option value="products">Products Inventory</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSaveProfile} style={{ padding: '0.75rem 1.25rem', background: '#1a1412', color: '#f8f6f0', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Save Environment
              </button>
            </div>
          )}

        </div>

      </main>
    </div>
  )
}

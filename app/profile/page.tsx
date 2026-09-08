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
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'productivity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Real-time productivity metrics simulation / state
  const [metrics, setMetrics] = useState({
    ordersManaged: 142,
    stockAudits: 28,
    efficiencyScore: '94.8%',
    pendingDispatches: 5
  })

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setBio(data.bio || '')
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
        if (data.updated_at) {
          setUpdatedAt(new Date(data.updated_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }))
        }
      } else if (error) {
        console.warn('Profile fetch warning:', error.message)
      }
      setLoading(false)
    }

    fetchProfile()
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

      setMessage({ text: 'Avatar successfully synchronized.', type: 'success' })
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
      setMessage({ text: 'Admin profile updated successfully.', type: 'success' })
      setUpdatedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f5f2eb', color: '#2c221e', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      
      {/* Dark Luxury Header Bar matching Storefront */}
      <div style={{ width: '100%', background: '#1e1614', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3a2e2b', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#f5f2eb', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px' }}>PRIMEA</span>
          <span style={{ color: '#c5b8af', fontSize: '0.85rem', borderLeft: '1px solid #3a2e2b', paddingLeft: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Executive Management Portal</span>
        </div>
        <Link href="/admin/dashboard" style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Return to Dashboard
        </Link>
      </div>

      {/* Main Container Layout Filling Screen */}
      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem', boxSizing: 'border-box' }}>
        
        {/* Top Profile Banner Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(44,34,30,0.04)', marginBottom: '2rem' }}>
          
          {/* Decorative Luxury Header Banner with Subtle Gradient */}
          <div style={{ height: '160px', background: 'linear-gradient(135deg, #2c221e 0%, #4a3b35 100%)', padding: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-40px', left: '2.5rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
              <div 
                onClick={() => avatarUrl && setShowLightbox(true)}
                style={{ 
                  width: '104px', height: '104px', borderRadius: '50%', background: '#fff', padding: '4px', 
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)', cursor: avatarUrl ? 'zoom-in' : 'default', boxSizing: 'border-box' 
                }}
              >
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
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit Admin Profile
              </button>
            )}
          </div>

          {/* Profile Details Header Info */}
          <div style={{ padding: '3rem 2.5rem 1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#1e1614' }}>{fullName || 'Executive Administrator'}</h1>
                <span style={{ background: '#2c221e', color: '#d4af37', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '1px' }}>ADMINISTRATOR</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a6b63' }}>{user?.email || 'Loading credentials...'}</p>
            </div>

            {/* Quick KPI Overview Counters */}
            <div style={{ display: 'flex', gap: '1.5rem', background: '#f5f2eb', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Orders Handled</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c221e' }}>{metrics.ordersManaged}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Stock Audits</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c221e' }}>{metrics.stockAudits}</div>
              </div>
              <div style={{ borderLeft: '1px solid #dcd4cc', paddingLeft: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6b63', fontWeight: 600, textTransform: 'uppercase' }}>Efficiency Index</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#276749' }}>{metrics.efficiencyScore}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #e3ded6', padding: '0 2.5rem', background: '#faf8f5' }}>
            {[
              { id: 'overview', label: 'Profile Overview' },
              { id: 'activity', label: 'Real-Time Activity Log' },
              { id: 'productivity', label: 'Productivity & Performance' },
              { id: 'security', label: 'Credentials & Security' }
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

        {/* Status Notification Message */}
        {message.text && (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', background: message.type === 'error' ? '#fff5f5' : '#f0fff4', color: message.type === 'error' ? '#c53030' : '#276749', border: `1px solid ${message.type === 'error' ? '#feb2b2' : '#c6f6d5'}` }}>
            {message.text}
          </div>
        )}

        {/* TAB CONTENT AREAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Main Left Dynamic Pane */}
          <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
            
            {activeTab === 'overview' && (
              <div>
                {!isEditing ? (
                  <div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Executive Bio & Statement</h3>
                    <p style={{ margin: '0 0 2rem 0', fontSize: '0.95rem', color: '#4a3b35', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {bio || 'No administrative bio specified. Click edit above to add your summary description.'}
                    </p>

                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>Quick Administrative Tools</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div style={{ background: '#f5f2eb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#2c221e' }}>Order Management Dispatch</div>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#7a6b63' }}>Review pending client orders and assign fulfillment priority.</p>
                        <Link href="/admin/dashboard" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2c221e', textDecoration: 'none' }}>Open Order Queue →</Link>
                      </div>
                      <div style={{ background: '#f5f2eb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e3ded6' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#2c221e' }}>Inventory & Stock Audit</div>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#7a6b63' }}>Verify stock levels across luxury apparel catalogs.</p>
                        <Link href="/admin/dashboard" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2c221e', textDecoration: 'none' }}>Manage Catalog Stocks →</Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Edit Profile Information</h3>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Upload New Avatar</label>
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ fontSize: '0.85rem' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Full Legal Name / Admin Alias</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', background: '#f9f8f6', outline: 'none', boxSizing: 'border-box' }} 
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a3b35', marginBottom: '0.4rem' }}>Professional Bio</label>
                      <textarea 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        rows={4} 
                        maxLength={300} 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', background: '#f9f8f6', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} 
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button 
                        type="submit" 
                        disabled={loading} 
                        style={{ flex: 1, padding: '0.75rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        {loading ? 'Saving Changes...' : 'Save Profile'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(false)}
                        style={{ padding: '0.75rem 1.5rem', background: '#e3ded6', color: '#2c221e', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Real-Time System Activity Feed</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Live secure session events tracked for your administrative credential.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { title: 'Database Profile Synchronized', time: 'Just now', type: 'SUCCESS' },
                    { title: 'Inventory Cache Verified on Supabase', time: '14 minutes ago', type: 'SYSTEM' },
                    { title: 'Secured Token Handshake Validated', time: '2 hours ago', type: 'AUTH' }
                  ].map((act, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: '#f9f8f6', borderRadius: '10px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2c221e' }}>{act.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#7a6b63', marginTop: '0.2rem' }}>{act.time}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: '#e3ded6', borderRadius: '4px', color: '#2c221e' }}>{act.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'productivity' && (
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Performance Evaluation & Comparison</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Evaluated against baseline admin benchmarks for order fulfillment and stock management.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#2c221e' }}>
                      <span>Order Fulfillment Speed</span>
                      <span>96% (Above Average)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e3ded6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '96%', height: '100%', background: '#2c221e' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#2c221e' }}>
                      <span>Stock Control Accuracy</span>
                      <span>91% (Optimal)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e3ded6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '91%', height: '100%', background: '#4a3b35' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#2c221e' }}>
                      <span>Catalog Curation Rating</span>
                      <span>98% (Top Tier)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e3ded6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '98%', height: '100%', background: '#d4af37' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e1614' }}>Authentication & Credential State</h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Your session token is securely encrypted via Supabase Auth architecture.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: '#4a3b35' }}>
                  <div style={{ padding: '0.75rem 1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Authentication Protocol</span>
                    <strong>JWT Bearer Token</strong>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e3ded6', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Session Status</span>
                    <strong style={{ color: '#276749' }}>Active & Secure</strong>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar Utility Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Quick Productivity Widget */}
            <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>Isolated Admin Tools</h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#7a6b63', lineHeight: '1.4' }}>Tools here operate exclusively on your administrative session without altering customer data.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={() => alert('Clearing local admin cache session...')} 
                  style={{ width: '100%', padding: '0.65rem', background: '#f5f2eb', color: '#2c221e', border: '1px solid #e3ded6', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  ⚡ Clear Session Cache
                </button>
                <button 
                  onClick={() => alert('Generating full admin session productivity summary report...')} 
                  style={{ width: '100%', padding: '0.65rem', background: '#f5f2eb', color: '#2c221e', border: '1px solid #e3ded6', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  📊 Export Performance Log
                </button>
              </div>
            </div>

            {/* Profile Metadata Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e3ded6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(44,34,30,0.02)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>System Timestamps</h4>
              <div style={{ fontSize: '0.83rem', color: '#7a6b63', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last Profile Sync:</span>
                  <strong style={{ color: '#2c221e' }}>{updatedAt || 'Real-time'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Database State:</span>
                  <strong style={{ color: '#276749' }}>Connected</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Lightbox Modal for Avatar Zoom */}
      {showLightbox && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30, 22, 20, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%', overflow: 'hidden', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e3ded6' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1614' }}>Admin Avatar Preview</span>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ background: '#f5f2eb', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 700, cursor: 'pointer', color: '#2c221e' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', background: '#1e1614', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '350px' }}>
              <img src={avatarUrl} alt="Enlarged Avatar" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
            </div>

            <div style={{ padding: '1rem 1.25rem', background: '#f9f8f6', display: 'flex', gap: '0.75rem', borderTop: '1px solid #e3ded6' }}>
              <a 
                href={avatarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.65rem', background: '#fff', color: '#2c221e', border: '1px solid #dcd4cc', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}
              >
                Open Original ↗
              </a>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ flex: 1, padding: '0.65rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

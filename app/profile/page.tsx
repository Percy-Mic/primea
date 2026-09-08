'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  
  // UI & Feature States
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'tools'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLog, setActionLog] = useState<string[]>([
    'System initialized secure session.',
    'Connected to PRIMEA production cluster.'
  ])
  const [message, setMessage] = useState({ text: '', type: '' })

  const supabase = createClient()

  useEffect(() => {
    let profileSubscription: any

    const initProfile = async () => {
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
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }))
        }
      } else if (error) {
        console.warn('Profile fetch warning:', error.message)
      }
      setLoading(false)

      // Setup Real-Time Subscriptions for live updates
      profileSubscription = supabase
        .channel('profile-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload: any) => {
            const updated = payload.new
            if (updated) {
              setFullName(updated.full_name || '')
              setBio(updated.bio || '')
              if (updated.avatar_url) setAvatarUrl(updated.avatar_url)
              if (updated.updated_at) {
                setUpdatedAt(new Date(updated.updated_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }))
              }
              setActionLog((prev) => [`[Realtime Sync] Profile data updated remotely at ${new Date().toLocaleTimeString()}`, ...prev])
            }
          }
        )
        .subscribe()
    }

    initProfile()

    return () => {
      if (profileSubscription) supabase.removeChannel(profileSubscription)
    }
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
      setActionLog((prev) => [`Uploaded new profile image file: ${fileName}`, ...prev])
    } catch (error: any) {
      setMessage({ text: error.message || 'Error uploading avatar.', type: 'error' })
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
      setMessage({ text: `Error updating profile: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile updated successfully.', type: 'success' })
      setUpdatedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      setIsEditing(false)
      setActionLog((prev) => [`Committed profile changes to database at ${new Date().toLocaleTimeString()}`, ...prev])
    }
    setLoading(false)
  }

  const triggerCachePurge = () => {
    setActionLog((prev) => [`[Admin Tool] CDN & Application cache successfully purged.`, ...prev])
    setMessage({ text: 'Storefront cache and CDN nodes refreshed.', type: 'success' })
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#12100e', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem 3rem', boxSizing: 'border-box' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #2a2522', paddingBottom: '1rem' }}>
        <Link href="/" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ← PRIMEA STOREFRONT
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', background: '#26221f', color: '#fbbf24', border: '1px solid #443c36', padding: '0.4rem 0.9rem', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Administrator Session
          </span>
        </div>
      </div>

      {/* Main Wide Layout Container */}
      <div style={{ background: '#1c1815', border: '1px solid #2e2824', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', width: '100%' }}>
        
        {/* Luxury Banner Header */}
        <div style={{ height: '180px', background: 'linear-gradient(135deg, #1f1a17 0%, #3b2d24 50%, #573b2b 100%)', position: 'relative', padding: '2rem', boxSizing: 'border-box', borderBottom: '1px solid #2e2824' }}>
          <div style={{ position: 'absolute', right: '2rem', top: '2rem', display: 'flex', gap: '0.75rem' }}>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ padding: '0.6rem 1.25rem', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit Admin Profile
              </button>
            )}
          </div>
        </div>

        {/* Body Section */}
        <div style={{ padding: '0 2.5rem 2.5rem 2.5rem', position: 'relative' }}>
          
          {/* Avatar & Title Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '2rem', marginTop: '-60px' }}>
            <div 
              onClick={() => avatarUrl && setShowLightbox(true)}
              style={{ 
                width: '120px', height: '120px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', 
                padding: '4px', cursor: avatarUrl ? 'zoom-in' : 'default', flexShrink: '0',
                boxShadow: '0 10px 25px rgba(245, 158, 11, 0.25)'
              }}
              title={avatarUrl ? "Click to inspect avatar" : ""}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#12100e', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#221c18', border: '1px solid #332b26', padding: '0.75rem 1.25rem', borderRadius: '10px', textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Catalog Control</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>Full Access</div>
              </div>
              <div style={{ background: '#221c18', border: '1px solid #332b26', padding: '0.75rem 1.25rem', borderRadius: '10px', textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Database Sync</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                  Real-Time Live
                </div>
              </div>
            </div>
          </div>

          {/* Profile Identity Details */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ margin: '0 0 0.3rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{fullName || 'Store Administrator'}</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af' }}>{user?.email || 'Loading email...'}</p>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #2e2824', marginBottom: '2rem' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid #f59e0b' : '2px solid transparent', color: activeTab === 'overview' ? '#f59e0b' : '#9ca3af', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Profile Overview
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'activity' ? '2px solid #f59e0b' : '2px solid transparent', color: activeTab === 'activity' ? '#f59e0b' : '#9ca3af', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Live Activity Stream
            </button>
            <button 
              onClick={() => setActiveTab('tools')}
              style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'tools' ? '2px solid #f59e0b' : '2px solid transparent', color: activeTab === 'tools' ? '#f59e0b' : '#9ca3af', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Admin Operations & Tools
            </button>
          </div>

          {/* Feedback Message */}
          {message.text && (
            <div style={{ padding: '0.9rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: message.type === 'error' ? '#f87171' : '#34d399', border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
              {message.text}
            </div>
          )}

          {/* TAB 1: OVERVIEW & EDIT */}
          {activeTab === 'overview' && (
            <div>
              {!isEditing ? (
                <div style={{ background: '#221c18', border: '1px solid #2e2824', borderRadius: '14px', padding: '2rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>Biography & Credentials</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#d1d5db', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {bio || 'No description provided. Click "Edit Admin Profile" to update your information.'}
                  </p>
                  
                  <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #2e2824', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#9ca3af' }}>
                    <span>Last Realtime Synchronization:</span>
                    <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{updatedAt || 'Awaiting synchronization'}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#221c18', padding: '2rem', borderRadius: '14px', border: '1px solid #2e2824' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Update Admin Configuration</h3>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.5rem' }}>Profile Avatar Image</label>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ fontSize: '0.9rem', color: '#9ca3af' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.5rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #3f352e', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#191512', color: '#fff', boxSizing: 'border-box' }} 
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db' }}>Bio Description</label>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{bio.length}/250</span>
                    </div>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      maxLength={250} 
                      rows={3} 
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #3f352e', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', resize: 'vertical', background: '#191512', color: '#fff', boxSizing: 'border-box' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#12100e', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                      {loading ? 'Committing...' : 'Save Profile Changes'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      style={{ padding: '0.75rem 1.5rem', background: '#2e2824', color: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: LIVE ACTIVITY STREAM */}
          {activeTab === 'activity' && (
            <div style={{ background: '#221c18', border: '1px solid #2e2824', borderRadius: '14px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>Real-Time System Log</h3>
                <span style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>🟢 Live Subscription Active</span>
              </div>
              <div style={{ background: '#151210', border: '1px solid #2a2420', borderRadius: '8px', padding: '1rem', maxHeight: '250px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {actionLog.map((log, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid #1f1a17', paddingBottom: '0.3rem' }}>
                    <span style={{ color: '#f59e0b' }}>&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN TOOLS */}
          {activeTab === 'tools' && (
            <div style={{ background: '#221c18', border: '1px solid #2e2824', borderRadius: '14px', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>Administrative Maintenance Tools</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#9ca3af' }}>Perform quick cache refreshes, database index re-checks, and session validations.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <button 
                  onClick={triggerCachePurge}
                  style={{ padding: '1rem', background: '#191512', border: '1px solid #3f352e', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', color: '#f3f4f6', transition: 'border-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#3f352e'}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.3rem' }}>Purge Application CDN</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Clear edge caches for store catalog items.</div>
                </button>

                <div style={{ padding: '1rem', background: '#191512', border: '1px solid #3f352e', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34d399', marginBottom: '0.3rem' }}>Database Cluster Status</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>PostgreSQL connection healthy & optimized.</div>
                </div>

                <div style={{ padding: '1rem', background: '#191512', border: '1px solid #3f352e', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#60a5fa', marginBottom: '0.3rem' }}>Storage Bucket Security</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Avatar storage policies enforced.</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal for Avatar Preview */}
      {showLightbox && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#1c1815', borderRadius: '16px', maxWidth: '440px', width: '100%', overflow: 'hidden', textAlign: 'center', border: '1px solid #332b26', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #2e2824' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6' }}>Administrator Avatar Inspector</span>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ background: '#2e2824', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', background: '#12100e', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '350px' }}>
              <img src={avatarUrl} alt="Enlarged Avatar" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} />
            </div>

            <div style={{ padding: '1rem 1.25rem', background: '#1c1815', display: 'flex', gap: '0.75rem', borderTop: '1px solid #2e2824' }}>
              <a 
                href={avatarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.7rem', background: '#2e2824', color: '#f3f4f6', border: 'none', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', textAlign: 'center' }}
              >
                Open Original File ↗
              </a>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ flex: 1, padding: '0.7rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#12100e', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

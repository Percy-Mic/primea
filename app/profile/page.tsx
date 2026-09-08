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
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

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

      setMessage({ text: 'Avatar uploaded successfully!', type: 'success' })
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
      setMessage({ text: 'Profile updated successfully!', type: 'success' })
      setUpdatedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setIsEditing(false)
    }
    setLoading(false)
  }

  const copyUserId = () => {
    if (!user) return
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
        <Link href="/admin/dashboard" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Back to PRIMEA Dashboard
        </Link>
        <span style={{ fontSize: '0.78rem', background: '#e0e7ff', color: '#4338ca', padding: '0.3rem 0.8rem', borderRadius: '20px', fontWeight: 600 }}>
          ✨ PRIMEA Member
        </span>
      </div>

      {/* Stunning Luxury Banner Card Container */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
        
        {/* Gradient Header Banner */}
        <div style={{ height: '140px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)', position: 'relative', padding: '1.5rem', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ padding: '0.5rem 1.1rem', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Content Body */}
        <div style={{ padding: '0 2rem 2rem 2rem', position: 'relative' }}>
          
          {/* Overlapping Avatar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.2rem', marginTop: '-50px' }}>
            <div 
              onClick={() => avatarUrl && setShowLightbox(true)}
              style={{ 
                width: '100px', height: '100px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', 
                padding: '4px', cursor: avatarUrl ? 'zoom-in' : 'default', flexShrink: '0',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)', transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseOut={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1)' }}
              title={avatarUrl ? "Click to view full photo" : ""}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.2rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'P'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.9rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Role</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5' }}>Administrator</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.9rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#16a34a' }}>🟢 Active</div>
              </div>
            </div>
          </div>

          {/* Name & ID Copy Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{fullName || 'PRIMEA Admin'}</h1>
              <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: '#fff', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>PRO</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span>{user?.email || 'Loading email...'}</span>
              <span>•</span>
              <button 
                onClick={copyUserId}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
              >
                {copied ? '✅ ID Copied!' : '📋 Copy User ID'}
              </button>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'overview' ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Profile Overview
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'activity' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'activity' ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Account Activity
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'security' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'security' ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Security Settings
            </button>
          </div>

          {/* Status Message */}
          {message.text && (
            <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
              {message.text}
            </div>
          )}

          {/* TAB 1: OVERVIEW & EDIT FORM */}
          {activeTab === 'overview' && (
            <div>
              {!isEditing ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Bio & Description</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {bio || 'No bio provided yet. Click "Edit Profile" above to customize your introduction.'}
                  </p>
                  
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Profile Last Synced:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{updatedAt || 'Never'}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Edit Profile Information</h3>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Profile Picture</label>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ fontSize: '0.85rem' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }} 
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Bio</label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{bio.length}/250</span>
                    </div>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      maxLength={250} 
                      rows={3} 
                      style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', background: '#fff', boxSizing: 'border-box' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      style={{ flex: 1, padding: '0.7rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      style={{ padding: '0.7rem 1.2rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVITY */}
          {activeTab === 'activity' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Recent System Actions</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>Successfully logged into PRIMEA Fashion Dashboard.</li>
                <li>Verified Supabase database profile synchronization.</li>
                <li>Updated avatar storage configuration.</li>
              </ul>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Authentication & Security</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>Your account is secured via Supabase Auth token verification.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                <div><strong>Email Provider:</strong> Google / Email Password</div>
                <div><strong>Encryption:</strong> TLS Secure Session Active</div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal for Enlarged Avatar Preview */}
      {showLightbox && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%', overflow: 'hidden', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>PRIMEA Avatar Preview</span>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '350px' }}>
              <img src={avatarUrl} alt="Enlarged Avatar" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
            </div>

            <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', display: 'flex', gap: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <a 
                href={avatarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.65rem', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}
              >
                Open Original ↗
              </a>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ flex: 1, padding: '0.65rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
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

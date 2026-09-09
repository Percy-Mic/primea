'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'more_info' | 'activity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  
  const [bio, setBio] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [tempAvatarUrl, setTempAvatarUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activitySearch, setActivitySearch] = useState('')
  const [activityStatus, setActivityStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchProfileAndData() {
      try {
        setLoading(true)
        setMessage(null)
        
        const { data: authData, error: authError } = await supabase.auth.getUser()
        const authUser = authData?.user

        if (authError || !authUser) {
          throw new Error('Not authenticated or session expired. Please log in.')
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile fetch error:', profileError.message)
        }

        const userData = {
          id: authUser.id,
          email: authUser.email || profileData?.email,
          full_name: profileData?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Admin User',
          bio: profileData?.bio || '',
          avatar_url: profileData?.avatar_url || '',
          role: profileData?.role || 'Admin',
          job_title: profileData?.job_title || 'Store Manager',
          department: profileData?.department || 'Operations',
          created_at: authUser.created_at
        }

        setUser(userData)
        setFullName(userData.full_name)
        setBio(userData.bio)
        setAvatarUrl(userData.avatar_url)
        setTempAvatarUrl(userData.avatar_url)

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (ordersError) {
          console.error('Orders fetch error:', ordersError.message)
        } else if (ordersData) {
          setOrders(ordersData)
        }
      } catch (err: any) {
        console.error('Initialization error:', err)
        setMessage({ type: 'error', text: err.message || 'Failed to load profile data.' })
      } finally {
        setLoading(false)
      }
    }

    fetchProfileAndData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      setUploading(true)
      setMessage(null)

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setTempAvatarUrl(data.publicUrl)
      setMessage({ type: 'success', text: 'Avatar uploaded successfully. Click Save Changes below to confirm.' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error uploading avatar image.' })
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEditing = () => {
    setFullName(user?.full_name || '')
    setBio(user?.bio || '')
    setAvatarUrl(user?.avatar_url || '')
    setTempAvatarUrl(user?.avatar_url || '')
    setIsEditing(false)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    
    setSaving(true)
    setMessage(null)

    try {
      const finalAvatar = tempAvatarUrl || avatarUrl
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          bio,
          avatar_url: finalAvatar,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setUser((prev: any) => ({ ...prev, full_name: fullName, bio, avatar_url: finalAvatar }))
      setAvatarUrl(finalAvatar)
      setMessage({ type: 'success', text: 'Profile updated and saved successfully.' })
      setIsEditing(false)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save changes.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const availableStatuses = Array.from(new Set(orders.map(o => o.status).filter(Boolean)))

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'pending': return 'Pending'
      case 'processing': return 'Processing'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const normalizeStatus = (order: any) => order.status || 'pending'
  const getOrderAmount = (order: any) => order.total_amount || 0
  const formatCurrency = (amount: number) => `$${Number(amount).toFixed(2)}`
  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A'

  const filteredActivity = orders.filter(item => {
    const titleMatch = (item.id || '').toLowerCase().includes(activitySearch.toLowerCase())
    const descMatch = (item.email || item.customer_name || '').toLowerCase().includes(activitySearch.toLowerCase())
    const matchesSearch = titleMatch || descMatch
    const matchesStatus = activityStatus === 'all' || item.status === activityStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div style={styles.page}>
        <Header />
        <div style={styles.container}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <h2 style={styles.loadingTitle}>Loading profile...</h2>
            <p style={styles.muted}>Please wait while we fetch your live data.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <Header />
        <div style={styles.container}>
          {message && (
            <div style={{ ...styles.message, ...styles.errorMessage, marginBottom: '20px' }}>
              <span>{message.text}</span>
            </div>
          )}
          <div style={styles.emptyCard}>
            <h2>Profile not found</h2>
            <p style={styles.muted}>Please log in or check your database policies.</p>
            <Link href="/login" style={{ ...styles.primaryButton, display: 'inline-block', marginTop: '15px', textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const initials = user.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AD'

  return (
    <div style={styles.page}>
      <Header />

      <main style={styles.container}>
        {message && message.type !== 'error' && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.successMessage : styles.infoMessage) }}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} style={styles.messageClose}>×</button>
          </div>
        )}

        <div style={styles.profileCard}>
          <div style={styles.cover}>
            <div style={styles.coverActions}>
              {!isEditing ? (
                <button onClick={() => { setIsEditing(true); setActiveTab('more_info'); }} style={styles.secondaryDarkButton} className="interactive-btn">
                  Edit Profile
                </button>
              ) : (
                <button onClick={handleCancelEditing} style={styles.secondaryDarkButton} className="interactive-btn">
                  Cancel Editing
                </button>
              )}
            </div>
            
            {/* Focusable Profile Image */}
            <div style={styles.avatarWrapper}>
              <div 
                role="button"
                tabIndex={0}
                aria-label="Profile image. Click or press Enter to change avatar."
                style={styles.avatar} 
                onClick={() => { setIsEditing(true); setActiveTab('more_info'); }} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsEditing(true);
                    setActiveTab('more_info');
                  }
                }}
                className="focusable-avatar"
              >
                {(isEditing ? tempAvatarUrl : user.avatar_url) ? (
                  <img src={isEditing ? tempAvatarUrl : user.avatar_url} alt={user.full_name} style={styles.avatarImage} />
                ) : (
                  <span style={styles.avatarInitials}>{initials}</span>
                )}
                <div style={styles.avatarOverlay}>
                  <span>Edit</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.profileSummary}>
            <div style={styles.identity}>
              <div style={styles.nameRow}>
                <h1 style={styles.name}>{user.full_name}</h1>
                <span style={styles.adminBadge}>{user.job_title}</span>
              </div>
              <p style={styles.email}>{user.email} • {user.department}</p>
              <span style={styles.lastUpdated}>Account active & secured</span>
            </div>

            <div style={styles.metricStrip}>
              <Metric label="Total Orders" value={orders.length} />
              <Metric label="Access Level" value="Manager" />
            </div>
          </div>

          {/* Non-scrolling flexible navigation tabs container */}
          <div style={styles.tabs}>
            <TabButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsEditing(false); }}>Overview</TabButton>
            <TabButton active={activeTab === 'more_info'} onClick={() => { setActiveTab('more_info'); }}>More Profile Info</TabButton>
            <TabButton active={activeTab === 'activity'} onClick={() => { setActiveTab('activity'); setIsEditing(false); }}>Activity Stream</TabButton>
            <TabButton active={activeTab === 'security'} onClick={() => { setActiveTab('security'); setIsEditing(false); }}>Security</TabButton>
          </div>
        </div>

        <div style={styles.contentGrid}>
          <section style={styles.mainCard}>
            {activeTab === 'overview' && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Administrator Biography</h2>
                    <p style={styles.muted}>Personal summary and system responsibilities.</p>
                  </div>
                </div>

                <div style={styles.bioBox}>
                  <span style={styles.smallLabel}>BIO</span>
                  <p style={styles.bio}>{user.bio || 'No biography provided yet. Click Edit Profile to add one.'}</p>
                </div>

                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Recent Store Activity</h2>
                    <p style={styles.muted}>Latest transactions processed across the platform.</p>
                  </div>
                  <button onClick={() => { setActiveTab('activity'); setIsEditing(false); }} style={styles.textLink}>View all</button>
                </div>

                {orders.length === 0 ? (
                  <p style={styles.muted}>No store transactions found in the database.</p>
                ) : (
                  <div style={styles.orderList}>
                    {orders.slice(0, 3).map(order => (
                      <div key={order.id} onClick={() => setSelectedOrder(order)} style={styles.orderRow} className="interactive-row">
                        <div style={styles.orderMain}>
                          <strong style={styles.orderTitle}>Order #{String(order.id).slice(0, 8)}</strong>
                          <span style={styles.orderDate}>{order.customer_name || order.email || 'Client Order'} • {formatDate(order.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ ...styles.statusBadge, ...getStatusStyle(normalizeStatus(order)) }}>
                            {getStatusLabel(normalizeStatus(order))}
                          </span>
                          <span style={styles.orderAmount}>{formatCurrency(getOrderAmount(order))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'more_info' && !isEditing && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>More Profile Information</h2>
                    <p style={styles.muted}>Detailed overview of your current account configuration.</p>
                  </div>
                  <button onClick={() => setIsEditing(true)} style={styles.primaryButton} className="interactive-btn">
                    Edit Details
                  </button>
                </div>

                <div style={styles.infoCardGrid}>
                  <div style={styles.infoFieldCard}>
                    <span style={styles.infoCardLabel}>Full Legal / Display Name</span>
                    <strong style={styles.infoCardValue}>{user.full_name}</strong>
                  </div>

                  <div style={styles.infoFieldCard}>
                    <span style={styles.infoCardLabel}>Email Address</span>
                    <strong style={styles.infoCardValue}>{user.email}</strong>
                  </div>

                  <div style={styles.infoFieldCard}>
                    <span style={styles.infoCardLabel}>Assigned Role</span>
                    <strong style={styles.infoCardValue}>{user.job_title} ({user.department})</strong>
                  </div>

                  <div style={styles.infoFieldCard}>
                    <span style={styles.infoCardLabel}>Biography Summary</span>
                    <p style={{ ...styles.infoCardValue, fontWeight: 400, fontSize: '13px', lineHeight: 1.4 }}>
                      {user.bio || 'None specified.'}
                    </p>
                  </div>

                  <div style={styles.infoFieldCard}>
                    <span style={styles.infoCardLabel}>Avatar Preview Link</span>
                    <p style={{ ...styles.infoCardValue, fontWeight: 400, fontSize: '12px', wordBreak: 'break-all', color: '#555' }}>
                      {user.avatar_url || 'Using default initials badge.'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'more_info' && isEditing && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Edit Profile Settings</h2>
                    <p style={styles.muted}>Update your personal details, avatar image, and account bio.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={styles.form}>
                  <div style={styles.uploadSectionContainer}>
                    <div style={styles.uploadPreviewWrapper}>
                      {tempAvatarUrl ? (
                        <img src={tempAvatarUrl} alt="Preview" style={styles.previewImage} />
                      ) : (
                        <div style={styles.previewPlaceholder}>{initials}</div>
                      )}
                    </div>

                    <div style={styles.uploadControls}>
                      <span style={styles.label}>Custom Avatar Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          style={styles.customUploadButton}
                          className="interactive-btn"
                        >
                          {uploading ? 'Uploading...' : 'Choose Image File'}
                        </button>
                        {tempAvatarUrl !== user.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setTempAvatarUrl(user.avatar_url)}
                            style={styles.secondaryButton}
                            className="interactive-btn"
                          >
                            Reset Image
                          </button>
                        )}
                      </div>
                      <span style={styles.helperText}>Uploads directly to secure cloud storage with instant preview.</span>
                    </div>
                  </div>

                  <label style={styles.field}>
                    <span style={styles.label}>Full Name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Email</span>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      style={{ ...styles.input, opacity: 0.65, backgroundColor: '#f5f5f5' }}
                    />
                    <span style={styles.helperText}>Administrator email cannot be changed here.</span>
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Biography</span>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={300}
                      rows={4}
                      style={styles.textarea}
                      placeholder="Brief administrator description..."
                    />
                    <span style={styles.helperText}>Maximum 300 characters.</span>
                  </label>

                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      onClick={handleCancelEditing}
                      disabled={saving}
                      style={styles.secondaryButton}
                      className="interactive-btn"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      style={styles.primaryButton}
                      className="interactive-btn"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeTab === 'activity' && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Activity Stream</h2>
                    <p style={styles.muted}>Filter store transactions and order events.</p>
                  </div>
                </div>

                <div style={styles.filterRow}>
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    style={styles.searchInput}
                  />

                  <select
                    value={activityStatus}
                    onChange={e => setActivityStatus(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="all">All Statuses</option>
                    {availableStatuses.map(st => (
                      <option key={st} value={st}>
                        {getStatusLabel(st)}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredActivity.length === 0 ? (
                  <EmptyState
                    title="No matching activity"
                    description="Try clearing your search filters."
                  />
                ) : (
                  <div style={styles.activityList}>
                    {filteredActivity.map(item => (
                      <div key={item.id} style={styles.activityItem} onClick={() => setSelectedOrder(item)} className="interactive-row">
                        <div>
                          <strong style={styles.activityTitle}>Order #{String(item.id).slice(0, 8)} - {formatCurrency(getOrderAmount(item))}</strong>
                          <p style={styles.activityDesc}>{item.customer_name || item.email || 'Client Transaction'}</p>
                        </div>
                        <span style={styles.activityTime}>{formatDate(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'security' && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Account Security</h2>
                    <p style={styles.muted}>Manage session credentials and access protocols.</p>
                  </div>
                </div>

                <div style={styles.securityBox}>
                  <div style={styles.securityMeta}>
                    <strong>Account Created</strong>
                    <p style={styles.muted}>{formatDate(user.created_at)}</p>
                  </div>

                  <div style={styles.securityMeta}>
                    <strong>Active Session ID</strong>
                    <p style={{ ...styles.muted, wordBreak: 'break-all' }}>{user.id}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={styles.dangerButton}
                    className="interactive-btn"
                  >
                    Sign out of account
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Order Details #{String(selectedOrder.id).slice(0, 8)}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <p><strong>Status:</strong> {getStatusLabel(normalizeStatus(selectedOrder))}</p>
            <p><strong>Amount:</strong> {formatCurrency(getOrderAmount(selectedOrder))}</p>
            <p><strong>Date:</strong> {formatDate(selectedOrder.created_at)}</p>
            <p><strong>Customer:</strong> {selectedOrder.customer_name || selectedOrder.email || 'N/A'}</p>
            <p><strong>Payment Method:</strong> {selectedOrder.payment_method || 'N/A'}</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
          scrollbar-width: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          width: 100vw;
        }
        .interactive-btn {
          transition: all 0.2s ease-in-out;
        }
        .interactive-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .interactive-row {
          transition: all 0.15s ease-in-out;
        }
        .interactive-row:hover {
          background-color: #f4f4f2 !important;
          transform: scale(1.005);
        }
        .focusable-avatar {
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
          outline: none;
        }
        .focusable-avatar:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.5), 0 8px 20px rgba(0,0,0,0.3) !important;
          z-index: 10;
        }
        .focusable-avatar:focus-visible {
          transform: scale(1.15);
          box-shadow: 0 0 0 4px #d4af37, 0 8px 20px rgba(0,0,0,0.35) !important;
          z-index: 10;
        }
      `}</style>
    </div>
  )
}

function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logoArea}>
        <span style={styles.logoText}>PRIMEA</span>
      </div>
      <div style={styles.navLinks}>
        <Link href="/admin/dashboard" style={styles.dashboardButton} className="interactive-btn">
          <span style={{ fontSize: '16px', lineHeight: 1 }}>←</span> Return to Dashboard
        </Link>
      </div>
    </header>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.metricItem}>
      <span style={styles.metricValue}>{value}</span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.tabButton,
        ...(active ? styles.tabButtonActive : {}),
      }}
      className="interactive-btn"
    >
      {children}
    </button>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={styles.emptyStateContainer}>
      <h4 style={styles.emptyStateTitle}>{title}</h4>
      <p style={styles.muted}>{description}</p>
    </div>
  )
}

function getStatusStyle(status: string) {
  if (status === 'completed' || status === 'delivered') {
    return { backgroundColor: '#d4edda', color: '#155724' }
  }
  if (status === 'cancelled' || status === 'rejected') {
    return { backgroundColor: '#f8d7da', color: '#721c24' }
  }
  return { backgroundColor: '#fff3cd', color: '#856404' }
}

const styles: { [key: string]: React.CSSProperties } = {
  dashboardButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    color: '#d4af37',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    transition: 'all 0.2s ease-in-out',
  },
  page: { minHeight: '100vh', backgroundColor: '#f8f5f0', color: '#1a1a1a', fontFamily: 'Inter, system-ui, sans-serif', width: '100%', maxWidth: '100vw', overflowX: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#121212', color: '#ffffff', width: '100%', position: 'sticky', top: 0, zIndex: 100 },
  logoArea: { fontWeight: 800, fontSize: '18px', letterSpacing: '1px' },
  logoText: { color: '#ffffff' },
  navLinks: { display: 'flex', gap: '15px' },
  navLink: { color: '#d4af37', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '4px 8px', borderRadius: '4px' },
  container: { maxWidth: '900px', margin: '0 auto', padding: '15px 12px', width: '100%', boxSizing: 'border-box' },
  loadingCard: { textAlign: 'center' as const, padding: '40px 20px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' },
  spinner: { width: '36px', height: '36px', border: '3px solid #f3f3f3', borderTop: '3px solid #d4af37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingTitle: { fontSize: '18px', fontWeight: 600, margin: 0 },
  muted: { color: '#666', fontSize: '13px', margin: 0 },
  emptyCard: { textAlign: 'center' as const, padding: '40px 20px', backgroundColor: '#fff', borderRadius: '12px' },
  sectionTitle: { fontSize: '17px', fontWeight: 700, margin: 0 },
  primaryButton: { backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  profileCard: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'visible', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '16px', width: '100%', position: 'relative' },
  cover: { backgroundColor: '#121212', height: '110px', position: 'relative', padding: '12px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' },
  coverActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  secondaryDarkButton: { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  avatarWrapper: { position: 'absolute', bottom: '-26px', left: '16px', zIndex: 5 },
  avatar: { width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#fff', border: '3px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', transformOrigin: 'bottom left' },
  avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { fontSize: '20px', fontWeight: 700, color: '#1a1a1a' },
  avatarOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '10px', textAlign: 'center', padding: '3px 0', fontWeight: 600, letterSpacing: '0.5px' },
  profileSummary: { padding: '32px 16px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' },
  identity: { flex: 1, minWidth: '200px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' },
  name: { fontSize: '20px', fontWeight: 700, margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' },
  adminBadge: { backgroundColor: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 },
  email: { color: '#666', fontSize: '12px', marginBottom: '4px', wordBreak: 'break-all', overflowWrap: 'anywhere' },
  lastUpdated: { color: '#888', fontSize: '11px' },
  metricStrip: { display: 'flex', gap: '20px', width: '100%', justifyContent: 'flex-start', borderTop: '1px solid #f0f0f0', paddingTop: '12px', marginTop: '8px', flexWrap: 'wrap' },
  metricItem: { textAlign: 'left' as const },
  metricValue: { display: 'block', fontSize: '15px', fontWeight: 700 },
  metricLabel: { fontSize: '11px', color: '#666' },
  tabs: { display: 'flex', borderTop: '1px solid #eaeaea', width: '100%', backgroundColor: '#faf9f6', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', overflow: 'hidden' },
  tabButton: { background: 'none', border: 'none', padding: '10px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '2px solid transparent', textAlign: 'center', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tabButtonActive: { color: '#1a1a1a', borderBottomColor: '#d4af37', backgroundColor: '#fff' },
  message: { padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', wordBreak: 'break-word', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  errorMessage: { backgroundColor: '#f8d7da', color: '#721c24' },
  successMessage: { backgroundColor: '#d4edda', color: '#155724' },
  infoMessage: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  messageClose: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'inherit' },
  contentGrid: { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' },
  mainCard: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', width: '100%' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' },
  bioBox: { backgroundColor: '#fcfbfa', padding: '14px', borderRadius: '8px', marginBottom: '20px', wordBreak: 'break-word', border: '1px solid #f0ede6' },
  smallLabel: { fontSize: '10px', fontWeight: '700', color: '#888', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' },
  bio: { fontSize: '13px', lineHeight: 1.5, color: '#333', margin: 0, wordBreak: 'break-word' },
  textLink: { color: '#d4af37', textDecoration: 'none', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  orderList: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
  orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 12px', backgroundColor: '#faf9f6', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', gap: '10px' },
  orderMain: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
  orderTitle: { fontSize: '13px', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  orderDate: { fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statusBadge: { padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' },
  orderAmount: { fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' },
  infoCardGrid: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', width: '100%' },
  infoFieldCard: { backgroundColor: '#faf9f6', border: '1px solid #f0ede6', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' },
  infoCardLabel: { fontSize: '10px', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' },
  infoCardValue: { fontSize: '13px', color: '#222', wordBreak: 'break-word', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' },
  uploadSectionContainer: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#faf9f6', padding: '12px', borderRadius: '8px', border: '1px solid #f0ede6', flexWrap: 'wrap' },
  uploadPreviewWrapper: { width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexShrink: 0 },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover' },
  previewPlaceholder: { fontSize: '16px', fontWeight: 700, color: '#333' },
  uploadControls: { flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' },
  customUploadButton: { backgroundColor: '#d4af37', color: '#111', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px' },
  helperText: { fontSize: '10px', color: '#888', margin: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' },
  label: { fontSize: '12px', fontWeight: 600, color: '#333' },
  input: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', width: '100%', outline: 'none' },
  textarea: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', resize: 'vertical', width: '100%', outline: 'none' },
  actionRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', flexWrap: 'wrap' },
  secondaryButton: { backgroundColor: '#f0f0f0', color: '#333', padding: '9px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', width: '100%' },
  searchInput: { flex: 1, minWidth: '160px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', outline: 'none' },
  selectInput: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', backgroundColor: '#fff', outline: 'none' },
  activityList: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
  activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', gap: '10px', width: '100%' },
  activityTitle: { fontSize: '12px', display: 'block', marginBottom: '2px', wordBreak: 'break-word' },
  activityDesc: { fontSize: '10px', color: '#666', wordBreak: 'break-word', margin: 0 },
  activityTime: { fontSize: '10px', color: '#888', whiteSpace: 'nowrap' },
  securityBox: { display: 'flex', flexDirection: 'column', gap: '14px' },
  securityMeta: { paddingBottom: '10px', borderBottom: '1px solid #eee' },
  dangerButton: { backgroundColor: '#dc3545', color: '#fff', padding: '9px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start', fontSize: '13px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' },
  modalContent: { backgroundColor: '#fff', padding: '18px', borderRadius: '12px', width: '380px', maxWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeButton: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: 0 },
  emptyStateContainer: { textAlign: 'center', padding: '24px' },
  emptyStateTitle: { fontSize: '14px', fontWeight: 600, marginBottom: '2px' },
}

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'activity' | 'security'>('overview')
  const [bio, setBio] = useState('')
  const [fullName, setFullName] = useState('')
  
  const [activitySearch, setActivitySearch] = useState('')
  const [activityStatus, setActivityStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchProfileAndData() {
      try {
        setLoading(true)
        setMessage(null)
        
        // 1. Get authenticated user session
        const { data: authData, error: authError } = await supabase.auth.getUser()
        const authUser = authData?.user

        if (authError || !authUser) {
          throw new Error('Not authenticated or session expired. Please log in.')
        }

        // 2. Fetch profile directly from the profiles table using Supabase client
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

        // 3. Fetch orders using the correct schema column 'total_amount'
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

  const handleCancelEditing = () => {
    setFullName(user?.full_name || '')
    setBio(user?.bio || '')
    setActiveTab('overview')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          bio,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setUser((prev: any) => ({ ...prev, full_name: fullName, bio }))
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setActiveTab('overview')
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
            <div style={styles.emptyIcon}>⚠️</div>
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
              <button onClick={() => setActiveTab('edit')} style={styles.secondaryDarkButton}>
                Edit Profile
              </button>
            </div>
            <div style={styles.avatarWrapper}>
              <div style={styles.avatar}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} style={styles.avatarImage} />
                ) : (
                  <span style={styles.avatarInitials}>{initials}</span>
                )}
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

          <div style={styles.tabs}>
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
            <TabButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')}>Settings</TabButton>
            <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>Activity Stream</TabButton>
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')}>Security</TabButton>
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
                  <button onClick={() => setActiveTab('activity')} style={styles.textLink}>View all</button>
                </div>

                {orders.length === 0 ? (
                  <p style={styles.muted}>No store transactions found in the database.</p>
                ) : (
                  <div style={styles.orderList}>
                    {orders.slice(0, 3).map(order => (
                      <div key={order.id} onClick={() => setSelectedOrder(order)} style={styles.orderRow}>
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

            {activeTab === 'edit' && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Edit Profile Settings</h2>
                    <p style={styles.muted}>Update your personal details and account info.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={styles.form}>
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
                      style={{ ...styles.input, opacity: 0.65 }}
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
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      style={styles.primaryButton}
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeTab === 'activity' && (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Activity stream</h2>
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
                      <div key={item.id} style={styles.activityItem} onClick={() => setSelectedOrder(item)}>
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
                    <h2 style={styles.sectionTitle}>Account security</h2>
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
                    <p style={styles.muted}>{user.id}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={styles.dangerButton}
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
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
        <Link href="/admin/dashboard" style={styles.navLink}>
          Dashboard
        </Link>
        {/* Commented out to prevent 404 error until the page is created */}
        {/* <Link href="/admin/users" style={styles.navLink}>Users</Link> */}
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
  page: { minHeight: '100vh', backgroundColor: '#f8f5f0', color: '#1a1a1a', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#121212', color: '#ffffff' },
  logoArea: { fontWeight: 800, fontSize: '20px', letterSpacing: '1px' },
  logoText: { color: '#ffffff' },
  navLinks: { display: 'flex', gap: '20px' },
  navLink: { color: '#d4af37', textDecoration: 'none', fontSize: '14px', fontWeight: 500 },
  container: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' },
  loadingCard: { textAlign: 'center' as const, padding: '60px', backgroundColor: '#fff', borderRadius: '8px' },
  loadingTitle: { fontSize: '20px', fontWeight: 600, marginTop: '15px' },
  muted: { color: '#666', fontSize: '14px' },
  emptyCard: { textAlign: 'center' as const, padding: '60px', backgroundColor: '#fff', borderRadius: '8px' },
  emptyIcon: { fontSize: '32px', marginBottom: '10px' },
  sectionTitle: { fontSize: '20px', fontWeight: 700, marginBottom: '6px' },
  primaryButton: { backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 },
  profileCard: { backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' },
  cover: { backgroundColor: '#121212', height: '140px', position: 'relative', padding: '20px' },
  coverActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  secondaryDarkButton: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  avatarWrapper: { position: 'absolute', bottom: '-30px', left: '30px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fff', border: '3px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { fontSize: '24px', fontWeight: 700, color: '#1a1a1a' },
  profileSummary: { padding: '40px 30px 20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '20px' },
  identity: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  name: { fontSize: '24px', fontWeight: 700 },
  adminBadge: { backgroundColor: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 },
  email: { color: '#666', fontSize: '14px', marginBottom: '4px' },
  lastUpdated: { color: '#888', fontSize: '12px' },
  metricStrip: { display: 'flex', gap: '20px' },
  metricItem: { textAlign: 'center' as const },
  metricValue: { display: 'block', fontSize: '18px', fontWeight: 700 },
  metricLabel: { fontSize: '12px', color: '#666' },
  tabs: { display: 'flex', borderTop: '1px solid #eaeaea', padding: '0 30px' },
  tabButton: { background: 'none', border: 'none', padding: '15px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#666', borderBottom: '2px solid transparent' },
  tabButtonActive: { color: '#1a1a1a', borderBottomColor: '#d4af37' },
  message: { padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' },
  errorMessage: { backgroundColor: '#f8d7da', color: '#721c24' },
  successMessage: { backgroundColor: '#d4edda', color: '#155724' },
  infoMessage: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  messageClose: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'inherit' },
  contentGrid: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  mainCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  bioBox: { backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '6px', marginBottom: '30px' },
  smallLabel: { fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  bio: { fontSize: '14px', lineHeight: 1.5, color: '#333' },
  textLink: { color: '#d4af37', textDecoration: 'none', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' },
  orderList: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 15px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' as const },
  orderMain: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  orderTitle: { fontSize: '14px', color: '#1a1a1a' },
  orderDate: { fontSize: '12px', color: '#888' },
  statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  orderAmount: { fontSize: '14px', fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  helperText: { fontSize: '12px', color: '#888', marginTop: '4px', display: 'block' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  label: { fontSize: '14px', fontWeight: 600 },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
  textarea: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', resize: 'vertical' as const },
  actionRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  secondaryButton: { backgroundColor: '#f0f0f0', color: '#333', padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  searchInput: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
  selectInput: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff' },
  activityList: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#fcfcfc', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer' },
  activityTitle: { fontSize: '14px', display: 'block', marginBottom: '2px' },
  activityDesc: { fontSize: '12px', color: '#666' },
  activityTime: { fontSize: '12px', color: '#888' },
  securityBox: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  securityMeta: { paddingBottom: '15px', borderBottom: '1px solid #eee' },
  dangerButton: { backgroundColor: '#dc3545', color: '#fff', padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  closeButton: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  emptyStateContainer: { textAlign: 'center' as const, padding: '40px' },
  emptyStateTitle: { fontSize: '16px', fontWeight: 600, marginBottom: '4px' },
}

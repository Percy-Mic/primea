'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminNav'

export default function AdminOrdersPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [orders, setOrders] = useState<any[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>('percymicnono@gmail.com')
  const [authLoading, setAuthLoading] = useState<boolean>(true)

  const previousOrderCount = useRef<number>(0)
  const isUpdating = useRef<boolean>(false)

  // Verify Admin Access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push('/login')
        return
      }

      setUserEmail(session.user.email || 'percymicnono@gmail.com')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        console.warn('Access check warning: User is not an admin.')
        router.push('/')
        return
      }

      setAuthLoading(false)
    }

    checkAdminAccess()
  }, [router])

  // SSR-safe viewport listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchOrders = async () => {
    if (isUpdating.current) return

    try {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      
      const fetchedOrders = data.success && Array.isArray(data.orders) ? data.orders : []

      if (previousOrderCount.current > 0 && fetchedOrders.length > previousOrderCount.current) {
        const latest = fetchedOrders[0]
        setNotification(`New Order #${String(latest.id).slice(0, 8)} received successfully!`)
        setTimeout(() => setNotification(null), 5000)
      }

      previousOrderCount.current = fetchedOrders.length
      setOrders(fetchedOrders)
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'Completed' || newStatus === 'Cancelled') {
      const confirmed = window.confirm(
        `Are you sure you want to mark order #${String(id).slice(0, 8)} as ${newStatus.toUpperCase()}? This will remove it from the active dashboard.`
      )
      if (!confirmed) return
    }

    isUpdating.current = true

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    )

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!res.ok) {
        const errData = await res.json()
        console.error('Server error updating status:', errData)
        alert(`Failed to update status: ${errData.error || 'Server error'}`)
        fetchOrders()
      }
    } catch (err) {
      console.error('Network error updating status:', err)
      fetchOrders()
    } finally {
      isUpdating.current = false
    }
  }

  // Filter out completed and cancelled orders from the active list
  const activeOrders = orders.filter((order) => {
    const status = (order.status || 'pending').toLowerCase()
    return status !== 'completed' && status !== 'cancelled' && status !== 'canceled'
  })

  // Helper function to render product item previews
  const renderProductItems = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return null
    }

    return (
      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.6rem',
          borderTop: '1px dashed rgba(212, 175, 55, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {items.map((item, idx) => {
          const product = item.products || item.product || {}
          const title = product.title || item.title || item.name || 'Product'
          const imageSrc = product.image_url || product.image || item.image || item.image_url
          const quantity = item.quantity || 1
          const price = item.price ?? product.price ?? 0

          return (
            <div
              key={item.id || idx}
              className="product-preview-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={title}
                  style={{
                    width: '38px',
                    height: '38px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #f3efe6 0%, #e6dec9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    color: '#786e65',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  IMG
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#1f1815' }}>
                  {title}
                </span>
                <span style={{ fontSize: '0.73rem', color: '#8c7d73', marginTop: '2px' }}>
                  Qty: {quantity} &times; ${Number(price).toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666', background: '#fcfbfa' }}>
        Verifying administrator credentials...
      </div>
    )
  }

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        @keyframes ambientGlow1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes ambientGlow2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shimmerBadge {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        body {
          margin: 0;
          padding: 0;
          background-color: #fbf9f6;
          font-family: system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .admin-layout-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-top: 115px;
          width: 100%;
          position: relative;
          background: linear-gradient(135deg, #fcfbfa 0%, #f4eee3 50%, #f7f3eb 100%);
          overflow: hidden;
        }

        /* Background Self-Sustaining Ambient Orbs */
        .admin-layout-wrapper::before,
        .admin-layout-wrapper::after {
          content: '';
          position: absolute;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
          opacity: 0.45;
        }
        .admin-layout-wrapper::before {
          top: -100px;
          right: -100px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(181, 89, 51, 0.05) 70%);
          animation: ambientGlow1 12s ease-in-out infinite;
        }
        .admin-layout-wrapper::after {
          bottom: 10%;
          left: -120px;
          background: radial-gradient(circle, rgba(165, 124, 76, 0.18) 0%, rgba(212, 175, 55, 0.03) 70%);
          animation: ambientGlow2 15s ease-in-out infinite;
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper {
            padding-top: 135px;
          }
        }

        .header-fixed-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          margin: 0;
          padding: 0;
          z-index: 9999;
          background-color: #ffffff;
          box-shadow: 0 4px 20px rgba(31, 24, 21, 0.06);
          box-sizing: border-box;
        }

        .fixed-top-header {
          padding: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .top-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(to right, #ffffff, #fcfbfa);
          border-top: 1px solid rgba(232, 226, 217, 0.8);
          border-bottom: 1px solid rgba(232, 226, 217, 0.8);
          padding: 0.4rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .nav-links-group {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          gap: 0.4rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #3b332e;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }

        .nav-link:hover {
          background-color: rgba(247, 244, 239, 0.8);
          color: #b55933;
          border-color: rgba(181, 89, 51, 0.2);
          transform: translateY(-1px);
        }

        .nav-link.active {
          background: linear-gradient(135deg, #1f1815 0%, #3a2e2a 100%);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(31, 24, 21, 0.2);
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: 1px solid #ded7cc;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          color: #1f1815;
          transition: all 0.2s ease;
        }
        .mobile-menu-btn:hover {
          background: #f7f4ef;
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
          }
          .nav-links-group {
            display: ${mobileMenuOpen ? 'flex' : 'none'};
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            padding-bottom: 0.5rem;
            border-top: 1px solid #f2ede4;
            margin-top: 0.4rem;
            padding-top: 0.4rem;
          }
        }

        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 1rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.5s ease-out forwards;
        }

        @media (min-width: 640px) {
          .admin-main-content {
            padding: 1.25rem 1.5rem 3rem 1.5rem;
          }
        }

        .luxury-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(232, 226, 217, 0.9);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(31, 24, 21, 0.04), 0 1px 3px rgba(31, 24, 21, 0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .luxury-card:hover {
          box-shadow: 0 14px 35px rgba(212, 175, 55, 0.12), 0 4px 10px rgba(31, 24, 21, 0.03);
          border-color: rgba(212, 175, 55, 0.35);
          transform: translateY(-2px);
        }

        .product-preview-row:hover {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(212, 175, 55, 0.4) !important;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.1);
        }
      `}</style>

      {/* Fixed Header & Navigation Group */}
      <div className="header-fixed-container">
        <div className="fixed-top-header">
          <AdminHeader
            title="Storefront Monitor"
            description="Real-time store progress and order management dashboard"
            userEmail={userEmail}
            onLogout={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
          />
        </div>

        <nav className="top-nav-bar">
          <button 
            type="button" 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {/* SVG Menu Icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            Menu
          </button>
          <ul className="nav-links-group">
            <li>
              <Link href="/admin/dashboard" className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                Orders
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                Inventory
              </Link>
            </li>
            <li>
              <Link href="/admin/products/new" className={`nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                Add Product
              </Link>
            </li>
          </ul>
          <Link href="/" target="_blank" className="nav-link" style={{ color: '#b55933', fontWeight: 600 }}>
            View Storefront
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '1rem' : '0',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.8rem', margin: 0, fontWeight: 700, color: '#1f1815', letterSpacing: '-0.02em' }}>
              Admin Order Dashboard
            </h1>
            <p style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', color: '#786e65', marginTop: '0.25rem' }}>
              Manage active storefront orders in real-time with automated tracking
            </p>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1f1815 0%, #3a2e2a 100%)',
              color: '#fff',
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              fontSize: '0.82rem',
              fontWeight: 600,
              alignSelf: isMobile ? 'stretch' : 'auto',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(31, 24, 21, 0.2)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
            }}
          >
            Active Orders: <span style={{ color: '#e8d5b5', fontWeight: 700 }}>{activeOrders.length}</span>
          </div>
        </div>

        {/* Live Notification */}
        {notification && (
          <div
            style={{
              background: 'linear-gradient(135deg, #1f1815 0%, #3a2e2a 100%)',
              color: '#fff',
              padding: '0.85rem 1.2rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontFamily: 'sans-serif',
              fontSize: '0.85rem',
              fontWeight: '600',
              boxShadow: '0 6px 20px rgba(31, 24, 21, 0.25)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            {notification}
          </div>
        )}

        {/* Empty State / Content View */}
        {activeOrders.length === 0 ? (
          <div
            className="luxury-card"
            style={{
              padding: '3.5rem',
              textAlign: 'center',
              color: '#786e65',
              fontFamily: 'sans-serif',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b55933" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem', opacity: 0.8 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f1815' }}>No active pending orders</div>
            <div style={{ fontSize: '0.8rem', color: '#8c7d73', marginTop: '0.25rem' }}>Incoming store transactions will populate here automatically.</div>
          </div>
        ) : isMobile ? (
          /* MOBILE CARDS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
            {activeOrders.map((order) => {
              const customerName = order.customer_name || order.shipping?.fullName || 'Guest'
              const email = order.email || order.shipping?.email || 'N/A'
              const address = order.address || order.shipping?.address || 'N/A'
              const paymentMethod = order.payment_method || order.shipping?.paymentMethod || 'COD'
              const total = order.total_amount ?? order.total ?? 0
              const currentStatus = order.status || 'Pending'
              const items = order.order_items || order.items || []

              return (
                <div
                  key={order.id}
                  className="luxury-card"
                  style={{
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(232, 226, 217, 0.8)', paddingBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1f1815' }}>#{String(order.id).slice(0, 8)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8c7d73', marginTop: '2px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        background: currentStatus === 'Shipped' ? 'rgba(224, 242, 254, 0.9)' : currentStatus === 'Processing' ? 'rgba(254, 240, 138, 0.8)' : 'rgba(254, 243, 199, 0.9)',
                        color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                        border: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      {currentStatus}
                    </span>
                  </div>

                  {renderProductItems(items)}

                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: '600', color: '#1f1815' }}>{customerName}</div>
                    <div style={{ color: '#8c7d73', fontSize: '0.8rem', wordBreak: 'break-all' }}>{email}</div>
                    <div style={{ color: '#8c7d73', fontSize: '0.75rem', marginTop: '2px' }}>{address}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(232, 226, 217, 0.8)', paddingTop: '0.6rem' }}>
                    <span style={{ textTransform: 'uppercase', color: '#8c7d73', fontWeight: 600, fontSize: '0.75rem' }}>{paymentMethod}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1f1815' }}>${Number(total).toFixed(2)}</span>
                  </div>

                  <div>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        fontSize: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#1f1815',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Completed">Mark Completed</option>
                      <option value="Cancelled">Mark Cancelled</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* DESKTOP TABLE VIEW */
          <div className="luxury-card" style={{ overflow: 'hidden' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'sans-serif',
              }}
            >
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1f1815 0%, #3a2e2a 100%)', color: '#fff', textAlign: 'left', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px', width: '35%' }}>Order Details & Time</th>
                  <th style={{ padding: '14px 18px', width: '25%' }}>Customer</th>
                  <th style={{ padding: '14px 18px', width: '15%' }}>Payment</th>
                  <th style={{ padding: '14px 18px', width: '10%' }}>Total</th>
                  <th style={{ padding: '14px 18px', width: '8%' }}>Status</th>
                  <th style={{ padding: '14px 18px', width: '7%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((order) => {
                  const customerName = order.customer_name || order.shipping?.fullName || 'Guest'
                  const email = order.email || order.shipping?.email || 'N/A'
                  const address = order.address || order.shipping?.address || 'N/A'
                  const paymentMethod = order.payment_method || order.shipping?.paymentMethod || 'COD'
                  const total = order.total_amount ?? order.total ?? 0
                  const currentStatus = order.status || 'Pending'
                  const items = order.order_items || order.items || []

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(232, 226, 217, 0.6)', verticalAlign: 'top', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1f1815' }}>#{String(order.id).slice(0, 8)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8c7d73', marginTop: '4px' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                        </div>
                        {renderProductItems(items)}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1f1815' }}>{customerName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#8c7d73' }}>{email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8c7d73', marginTop: '2px' }}>{address}</div>
                      </td>
                      <td style={{ padding: '16px 18px', textTransform: 'uppercase', fontSize: '0.8rem', color: '#594d45', fontWeight: 600 }}>
                        {paymentMethod}
                      </td>
                      <td style={{ padding: '16px 18px', fontWeight: 'bold', fontSize: '0.95rem', color: '#1f1815' }}>
                        ${Number(total).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            background: currentStatus === 'Shipped' ? 'rgba(224, 242, 254, 0.9)' : currentStatus === 'Processing' ? 'rgba(254, 240, 138, 0.8)' : 'rgba(254, 243, 199, 0.9)',
                            color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                            border: '1px solid rgba(0,0,0,0.04)',
                          }}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          style={{ 
                            padding: '0.45rem', 
                            borderRadius: '6px', 
                            border: '1px solid rgba(212, 175, 55, 0.3)', 
                            fontSize: '0.82rem', 
                            background: 'rgba(255, 255, 255, 0.9)', 
                            color: '#1f1815',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Completed">Mark Completed</option>
                          <option value="Cancelled">Mark Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

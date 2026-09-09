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
          marginTop: '0.85rem',
          paddingTop: '0.75rem',
          borderTop: '1px dashed rgba(212, 175, 55, 0.3)',
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
              className="product-preview-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(247,244,239,0.8))',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                transition: 'all 0.3s ease',
              }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={title}
                  style={{
                    width: '42px',
                    height: '42px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #e8e2d9, #d5cec5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    color: '#786e65',
                    flexShrink: '0',
                    fontWeight: 600,
                  }}
                >
                  No Img
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.3' }}>
                <span style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1f1815' }}>
                  {title}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#8c7b6e', marginTop: '2px' }}>
                  Qty: {quantity} × ${Number(price).toFixed(2)}
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
        @keyframes subtleFloat {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes backgroundShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(181, 89, 51, 0.3); }
          70% { box-shadow: 0 0 0 10px rgba(181, 89, 51, 0); }
          100% { box-shadow: 0 0 0 0 rgba(181, 89, 51, 0); }
        }

        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #fcfbfa 0%, #f4ede2 50%, #fcfbfa 100%);
          background-size: 200% 200%;
          animation: backgroundShift 18s ease infinite;
          font-family: system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        /* Self-sustaining floating background visual elements */
        .admin-layout-wrapper::before {
          content: '';
          position: fixed;
          top: -150px;
          right: -150px;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(181, 89, 51, 0.03) 60%, transparent 100%);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          animation: subtleFloat 12s ease-in-out infinite;
        }

        .admin-layout-wrapper::after {
          content: '';
          position: fixed;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(181, 89, 51, 0.06) 0%, rgba(31, 24, 21, 0.02) 70%, transparent 100%);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          animation: subtleFloat 15s ease-in-out infinite reverse;
        }

        .admin-layout-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-top: 115px;
          width: 100%;
          position: relative;
          z-index: 1;
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
          box-shadow: 0 4px 20px rgba(31, 24, 21, 0.08);
          box-sizing: border-box;
          backdrop-filter: blur(10px);
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
          background: linear-gradient(90deg, #ffffff 0%, #fbf9f5 100%);
          border-top: 1px solid rgba(212, 175, 55, 0.2);
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding: 0.5rem 1.75rem;
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
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #3b332e;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }

        .nav-link:hover {
          background-color: rgba(212, 175, 55, 0.08);
          color: #b55933;
          border-color: rgba(212, 175, 55, 0.3);
          transform: translateY(-1px);
        }

        .nav-link.active {
          background: linear-gradient(135deg, #1f1815 0%, #2c221e 100%);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(31, 24, 21, 0.25);
          border-color: #d4af37;
        }

        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: 1px solid rgba(212, 175, 55, 0.3);
          padding: 0.35rem 0.8rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          color: #1f1815;
          transition: all 0.3s ease;
        }

        .mobile-menu-btn:hover {
          background-color: rgba(212, 175, 55, 0.1);
          border-color: #b55933;
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
            padding-bottom: 0.75rem;
            border-top: 1px solid rgba(212, 175, 55, 0.15);
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            animation: fadeInSlide 0.3s ease forwards;
          }
        }

        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 1.5rem;
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          animation: fadeInSlide 0.5s ease-out forwards;
        }

        @media (min-width: 640px) {
          .admin-main-content {
            padding: 2rem 2rem 3.5rem 2rem;
          }
        }

        .order-card-luxury {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(31, 24, 21, 0.05);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .order-card-luxury:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(181, 89, 51, 0.12);
          border-color: rgba(212, 175, 55, 0.5);
        }

        .luxury-table-row {
          transition: all 0.25s ease;
        }

        .luxury-table-row:hover {
          background-color: rgba(247, 244, 239, 0.7) !important;
        }

        .product-preview-item:hover {
          border-color: #b55933 !important;
          transform: scale(1.01);
        }

        .action-select-luxury {
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #fbf9f5, #f0eae1);
        }

        .action-select-luxury:hover, .action-select-luxury:focus {
          border-color: #b55933;
          box-shadow: 0 0 0 3px rgba(181, 89, 51, 0.15);
          outline: none;
        }

        .notification-banner {
          background: linear-gradient(135deg, #1f1815 0%, #3b2c26 100%);
          color: #fff;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 8px 25px rgba(31, 24, 21, 0.25);
          border-left: 4px solid #d4af37;
          animation: fadeInSlide 0.4s ease forwards, pulseGlow 2.5s infinite;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
            Menu
          </button>
          <ul className="nav-links-group">
            <li><Link href="/admin/dashboard" className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
            <li><Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link></li>
            <li><Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>Inventory</Link></li>
            <li><Link href="/admin/products/new" className={`nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>Add Product</Link></li>
          </ul>
          <Link href="/" target="_blank" className="nav-link" style={{ color: '#b55933', fontWeight: 600 }}>View Storefront &rarr;</Link>
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
            marginBottom: '1.75rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, fontWeight: 700, color: '#1f1815', letterSpacing: '-0.02em' }}>
              Admin Order Dashboard
            </h1>
            <p style={{ fontFamily: 'sans-serif', fontSize: '0.88rem', color: '#786e65', marginTop: '0.3rem' }}>
              Manage active storefront orders in real-time with luxury performance tracking
            </p>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1f1815 0%, #3b2c26 100%)',
              color: '#fff',
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              fontSize: '0.85rem',
              fontWeight: 600,
              alignSelf: isMobile ? 'stretch' : 'auto',
              textAlign: 'center',
              boxShadow: '0 6px 20px rgba(31, 24, 21, 0.2)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
            }}
          >
            Active Orders: {activeOrders.length}
          </div>
        </div>

        {/* Live Notification */}
        {notification && (
          <div className="notification-banner">
            <span>{notification}</span>
          </div>
        )}

        {/* Empty State / Content View */}
        {activeOrders.length === 0 ? (
          <div
            className="order-card-luxury"
            style={{
              padding: '4rem 3rem',
              textAlign: 'center',
              color: '#786e65',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1f1815', marginBottom: '0.4rem' }}>All Caught Up</div>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>No active pending orders requiring attention at the moment.</p>
          </div>
        ) : isMobile ? (
          /* MOBILE CARDS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'sans-serif' }}>
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
                  className="order-card-luxury"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f1815' }}>#{String(order.id).slice(0, 8)}</div>
                      <div style={{ fontSize: '0.78rem', color: '#8c7b6e', marginTop: '3px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: currentStatus === 'Shipped' ? 'rgba(3, 105, 161, 0.1)' : currentStatus === 'Processing' ? 'rgba(133, 77, 14, 0.1)' : 'rgba(180, 83, 9, 0.1)',
                        color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                        border: `1px solid ${currentStatus === 'Shipped' ? 'rgba(3, 105, 161, 0.2)' : currentStatus === 'Processing' ? 'rgba(133, 77, 14, 0.2)' : 'rgba(180, 83, 9, 0.2)'}`,
                      }}
                    >
                      {currentStatus}
                    </span>
                  </div>

                  {renderProductItems(items)}

                  <div style={{ fontSize: '0.88rem' }}>
                    <div style={{ fontWeight: '600', color: '#1f1815' }}>{customerName}</div>
                    <div style={{ color: '#8c7b6e', fontSize: '0.82rem', wordBreak: 'break-all' }}>{email}</div>
                    <div style={{ color: '#8c7b6e', fontSize: '0.78rem', marginTop: '3px' }}>{address}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '0.75rem' }}>
                    <span style={{ textTransform: 'uppercase', color: '#8c7b6e', fontWeight: 600, letterSpacing: '0.05em' }}>{paymentMethod}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.15rem', color: '#b55933' }}>${Number(total).toFixed(2)}</span>
                  </div>

                  <div>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="action-select-luxury"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        fontSize: '0.85rem',
                        color: '#1f1815',
                        cursor: 'pointer',
                        fontWeight: 500,
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
          <div className="order-card-luxury" style={{ overflow: 'hidden' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'sans-serif',
              }}
            >
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1f1815 0%, #2c221e 100%)', color: '#fff', textAlign: 'left', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
                    <tr key={order.id} className="luxury-table-row" style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.15)', verticalAlign: 'top' }}>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: '#1f1815' }}>#{String(order.id).slice(0, 8)}</div>
                        <div style={{ fontSize: '0.78rem', color: '#8c7b6e', marginTop: '4px' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                        </div>
                        {renderProductItems(items)}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1f1815' }}>{customerName}</div>
                        <div style={{ fontSize: '0.82rem', color: '#8c7b6e', marginTop: '2px' }}>{email}</div>
                        <div style={{ fontSize: '0.78rem', color: '#8c7b6e', marginTop: '2px' }}>{address}</div>
                      </td>
                      <td style={{ padding: '16px 18px', textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 600, color: '#4a3f38' }}>
                        {paymentMethod}
                      </td>
                      <td style={{ padding: '16px 18px', fontWeight: 'bold', fontSize: '0.95rem', color: '#b55933' }}>
                        ${Number(total).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: currentStatus === 'Shipped' ? 'rgba(3, 105, 161, 0.1)' : currentStatus === 'Processing' ? 'rgba(133, 77, 14, 0.1)' : 'rgba(180, 83, 9, 0.1)',
                            color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                            border: `1px solid ${currentStatus === 'Shipped' ? 'rgba(3, 105, 161, 0.2)' : currentStatus === 'Processing' ? 'rgba(133, 77, 14, 0.2)' : 'rgba(180, 83, 9, 0.2)'}`,
                            display: 'inline-block',
                          }}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="action-select-luxury"
                          style={{ padding: '0.45rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, color: '#1f1815' }}
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

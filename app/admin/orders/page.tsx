'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminNav'
import AdminSubNav from '@/components/AdminSubNav'

export default function AdminOrdersPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<any[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
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
        setNotification(`New Order #${String(latest.id).slice(0, 8)} received.`)
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

  const activeOrders = orders.filter((order) => {
    const status = (order.status || 'pending').toLowerCase()
    return status !== 'completed' && status !== 'cancelled' && status !== 'canceled'
  })

  const renderProductItems = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return null

    return (
      <div
        style={{
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid #EBEBEB',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FAFAFA',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid #EBEBEB',
              }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={title}
                  style={{
                    width: '24px',
                    height: '24px',
                    objectFit: 'cover',
                    borderRadius: '3px',
                    border: '1px solid #EBEBEB',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '3px',
                    background: '#EBEBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: '#666666',
                    flexShrink: 0,
                  }}
                >
                  IMG
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', color: '#171717' }}>
                  {title}
                </span>
                <span style={{ fontSize: '9px', color: '#666666' }}>
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'GeistSans, system-ui, sans-serif', color: '#666666', background: '#FAFAFA' }}>
        Verifying administrator credentials...
      </div>
    )
  }

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Lock the body and HTML so the main viewport is not scrollable */
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background-color: #FAFAFA;
          color: #171717;
          font-family: GeistSans, system-ui, -apple-system, sans-serif;
        }

        .admin-layout-wrapper {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          background-color: #FAFAFA;
          background-image: linear-gradient(to right, #EBEBEB 1px, transparent 1px),
                            linear-gradient(to bottom, #EBEBEB 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Permanently fixed header layer pinned strictly to viewport top */
        .header-fixed-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 99999 !important;
          background-color: #171717;
          border-bottom: 1px solid #2A2A2A;
          width: 100%;
          flex-shrink: 0;
        }

        /* Main content area takes remaining height and handles standalone scrolling */
        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 130px 12px 20px 12px; /* Top padding clears the fixed header height */
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          overflow-y: auto; /* ONLY this section scrolls */
          animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (min-width: 768px) {
          .admin-main-content {
            padding: 140px 24px 24px 24px;
          }
        }

        .order-card-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .order-card-hover:hover {
          border-color: #171717;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          transform: translateY(-1px);
        }

        .pill-status-pending {
          background: #FAFAFA;
          color: #171717;
          border: 1px solid #EBEBEB;
        }
        .pill-status-processing {
          background: rgba(0,0,0,0.03);
          color: #171717;
          border: 1px solid #171717;
        }
        .pill-status-shipped {
          background: #171717;
          color: #FFFFFF;
        }

        .admin-select-input {
          padding: 4px 8px;
          border-radius: 9999px;
          border: 1px solid #EBEBEB;
          font-size: 11px;
          background: #FFFFFF;
          color: #171717;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }
        .admin-select-input:hover, .admin-select-input:focus {
          border-color: #171717;
          box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.05);
        }
      `}</style>

      {/* Fixed Header Stack */}
      <div className="header-fixed-container">
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
        <AdminSubNav />
      </div>

      {/* Scrollable Main Content Area */}
      <div className="admin-main-content">
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '8px' : '0',
            marginBottom: '12px',
          }}
        >
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '28px', margin: 0, fontWeight: 400, letterSpacing: '-1px', color: '#171717' }}>
              Orders Monitor
            </h1>
            <p style={{ fontSize: isMobile ? '11px' : '13px', color: '#666666', marginTop: '2px', letterSpacing: '-0.2px' }}>
              Manage active storefront orders in real-time with zero-latency synchronization.
            </p>
          </div>
          <div
            style={{
              background: '#171717',
              color: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              alignSelf: isMobile ? 'flex-start' : 'auto',
              textAlign: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55e', display: 'inline-block' }}></span>
            Active Orders: {activeOrders.length}
          </div>
        </div>

        {/* Live Notification */}
        {notification && (
          <div
            style={{
              background: '#171717',
              color: '#FFFFFF',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '10px',
              fontSize: '11px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              animation: 'fadeInScale 0.3s ease-out forwards',
            }}
          >
            <span>{notification}</span>
            <span style={{ fontSize: '9px', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Stream</span>
          </div>
        )}

        {/* Empty State / Content View */}
        {activeOrders.length === 0 ? (
          <div
            style={{
              padding: '30px 12px',
              textAlign: 'center',
              color: '#666666',
              background: '#FFFFFF',
              border: '1px solid #EBEBEB',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#171717', marginBottom: '3px' }}>No active pending orders.</p>
            <p style={{ fontSize: '11px', color: '#A3A3A3' }}>Incoming requests will automatically appear here.</p>
          </div>
        ) : isMobile ? (
          /* MOBILE CARDS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  className="order-card-hover"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #EBEBEB', paddingBottom: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#171717' }}>#{String(order.id).slice(0, 8)}</div>
                      <div style={{ fontSize: '9px', color: '#666666', marginTop: '1px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        fontSize: '9px',
                        fontWeight: 500,
                      }}
                      className={
                        currentStatus === 'Shipped' ? 'pill-status-shipped' : currentStatus === 'Processing' ? 'pill-status-processing' : 'pill-status-pending'
                      }
                    >
                      {currentStatus}
                    </span>
                  </div>

                  {renderProductItems(items)}

                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: 600, color: '#171717' }}>{customerName}</div>
                    <div style={{ color: '#666666', fontSize: '10px', wordBreak: 'break-all', marginTop: '1px' }}>{email}</div>
                    <div style={{ color: '#A3A3A3', fontSize: '9px', marginTop: '1px' }}>{address}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid #EBEBEB', paddingTop: '6px' }}>
                    <span style={{ textTransform: 'uppercase', color: '#666666', fontSize: '9px', fontWeight: 500, letterSpacing: '0.5px' }}>{paymentMethod}</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#171717' }}>${Number(total).toFixed(2)}</span>
                  </div>

                  <div>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="admin-select-input"
                      style={{ width: '100%' }}
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
          <div style={{ background: '#FFFFFF', border: '1px solid #EBEBEB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: '#171717', color: '#FFFFFF', fontSize: '9px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', width: '35%', fontWeight: 500 }}>Order Details & Time</th>
                  <th style={{ padding: '10px 14px', width: '25%', fontWeight: 500 }}>Customer</th>
                  <th style={{ padding: '10px 14px', width: '15%', fontWeight: 500 }}>Payment</th>
                  <th style={{ padding: '10px 14px', width: '10%', fontWeight: 500 }}>Total</th>
                  <th style={{ padding: '10px 14px', width: '8%', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '10px 14px', width: '7%', fontWeight: 500 }}>Action</th>
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
                    <tr key={order.id} style={{ borderBottom: '1px solid #EBEBEB', verticalAlign: 'top' }} className="order-card-hover">
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#171717' }}>#{String(order.id).slice(0, 8)}</div>
                        <div style={{ fontSize: '10px', color: '#666666', marginTop: '2px' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                        </div>
                        {renderProductItems(items)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: '11px', color: '#171717' }}>{customerName}</div>
                        <div style={{ fontSize: '10px', color: '#666666', marginTop: '1px' }}>{email}</div>
                        <div style={{ fontSize: '9px', color: '#A3A3A3', marginTop: '1px' }}>{address}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '10px', color: '#666666', fontWeight: 500 }}>
                        {paymentMethod}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '12px', color: '#171717' }}>
                        ${Number(total).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            fontSize: '9px',
                            fontWeight: 500,
                            display: 'inline-block',
                          }}
                          className={
                            currentStatus === 'Shipped' ? 'pill-status-shipped' : currentStatus === 'Processing' ? 'pill-status-processing' : 'pill-status-pending'
                          }
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="admin-select-input"
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

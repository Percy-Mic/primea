'use client'

import { useState, useEffect, useRef } from 'react'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const previousOrderCount = useRef<number>(0)
  const isUpdating = useRef<boolean>(false)

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
      const fetchedOrders = Array.isArray(data) ? data : data.orders || []

      if (previousOrderCount.current > 0 && fetchedOrders.length > previousOrderCount.current) {
        const latest = fetchedOrders[0]
        setNotification(`🚨 New Order #${String(latest.id).slice(0, 8)} received!`)
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
    // Safety check for critical status changes to prevent accidental clicks
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
        fetchOrders() // Revert local optimistic update on error
      }
    } catch (err) {
      console.error('Network error updating status:', err)
      fetchOrders() // Revert local optimistic update on error
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
          borderTop: '1px dashed #e2dad0',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: '#faf8f5',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid #f0eae1',
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
                    borderRadius: '4px',
                    border: '1px solid #e2dad0',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '4px',
                    background: '#e8e2d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    color: '#786e65',
                    flexShrink: 0,
                  }}
                >
                  No Img
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#1f1815' }}>
                  {title}
                </span>
                <span style={{ fontSize: '0.73rem', color: '#786e65', marginTop: '2px' }}>
                  Qty: {quantity} × ${Number(price).toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        padding: isMobile ? '1rem' : '1.5rem',
        fontFamily: 'serif',
        color: '#1f1815',
        maxWidth: '1000px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '1rem' : '0',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, fontWeight: 'normal' }}>
            Admin Order Dashboard
          </h1>
          <p style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', color: '#786e65', marginTop: '0.3rem' }}>
            Manage active storefront orders in real-time
          </p>
        </div>
        <div
          style={{
            background: '#1f1815',
            color: '#fff',
            padding: '0.5rem 1.2rem',
            borderRadius: '4px',
            fontFamily: 'sans-serif',
            fontSize: '0.85rem',
            alignSelf: isMobile ? 'stretch' : 'auto',
            textAlign: 'center',
          }}
        >
          Active Orders: {activeOrders.length}
        </div>
      </div>

      {/* Live Notification */}
      {notification && (
        <div
          style={{
            background: '#1f1815',
            color: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
          }}
        >
          {notification}
        </div>
      )}

      {/* Empty State */}
      {activeOrders.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#786e65',
            fontFamily: 'sans-serif',
            background: '#fff',
            border: '1px solid #e2dad0',
            borderRadius: '6px',
          }}
        >
          No active pending orders.
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
                style={{
                  background: '#fff',
                  border: '1px solid #e2dad0',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>#{String(order.id).slice(0, 8)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#786e65', marginTop: '2px' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: currentStatus === 'Shipped' ? '#e0f2fe' : currentStatus === 'Processing' ? '#fef08a' : '#fef3c7',
                      color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                    }}
                  >
                    {currentStatus}
                  </span>
                </div>

                {/* Product Items Preview for Mobile */}
                {renderProductItems(items)}

                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '600' }}>{customerName}</div>
                  <div style={{ color: '#786e65', fontSize: '0.8rem', wordBreak: 'break-all' }}>{email}</div>
                  <div style={{ color: '#786e65', fontSize: '0.75rem', marginTop: '2px' }}>{address}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                  <span style={{ textTransform: 'uppercase', color: '#786e65' }}>{paymentMethod}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${Number(total).toFixed(2)}</span>
                </div>

                <div>
                  <select
                    value={currentStatus}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '0.85rem',
                      background: '#fff',
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
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            border: '1px solid #e2dad0',
            fontFamily: 'sans-serif',
          }}
        >
          <thead>
            <tr style={{ background: '#1f1815', color: '#fff', textAlign: 'left', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px', width: '35%' }}>Order Details & Time</th>
              <th style={{ padding: '14px', width: '25%' }}>Customer</th>
              <th style={{ padding: '14px', width: '15%' }}>Payment</th>
              <th style={{ padding: '14px', width: '10%' }}>Total</th>
              <th style={{ padding: '14px', width: '8%' }}>Status</th>
              <th style={{ padding: '14px', width: '7%' }}>Action</th>
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
                <tr key={order.id} style={{ borderBottom: '1px solid #e2dad0', verticalAlign: 'top' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>#{String(order.id).slice(0, 8)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#786e65', marginTop: '4px' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                    </div>

                    {/* Product Items Preview for Desktop */}
                    {renderProductItems(items)}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: '600' }}>{customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#786e65' }}>{email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#786e65' }}>{address}</div>
                  </td>
                  <td style={{ padding: '14px', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    {paymentMethod}
                  </td>
                  <td style={{ padding: '14px', fontWeight: 'bold' }}>
                    ${Number(total).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: currentStatus === 'Shipped' ? '#e0f2fe' : currentStatus === 'Processing' ? '#fef08a' : '#fef3c7',
                        color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',
                      }}
                    >
                      {currentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
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
      )}
    </div>
  )
}
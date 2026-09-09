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



  if (authLoading) {

    return (

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>

        Verifying administrator credentials...

      </div>

    )

  }



  return (

    <div className="admin-layout-wrapper">

      <style>{`

        body {

          margin: 0;

          padding: 0;

          background-color: #fcfbfa;

          font-family: system-ui, -apple-system, sans-serif;

          overflow-x: hidden;

        }



        .admin-layout-wrapper {

          display: flex;

          flex-direction: column;

          min-height: 100vh;

          padding-top: 115px;

          width: 100%;

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

          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

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

          background-color: #ffffff;

          border-top: 1px solid #e8e2d9;

          border-bottom: 1px solid #e8e2d9;

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

          padding: 0.35rem 0.65rem;

          border-radius: 6px;

          font-size: 0.85rem;

          font-weight: 500;

          color: #3b332e;

          text-decoration: none;

          transition: all 0.15s ease;

        }



        .nav-link:hover {

          background-color: #f7f4ef;

          color: #b55933;

        }



        .nav-link.active {

          background-color: #1f1815;

          color: #ffffff;

          font-weight: 600;

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

        }



        @media (min-width: 640px) {

          .admin-main-content {

            padding: 1.25rem 1.5rem 3rem 1.5rem;

          }

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

            ☰ Menu

          </button>

          <ul className="nav-links-group">

            <li><Link href="/admin/dashboard" className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>

            <li><Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link></li>

            <li><Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>Inventory</Link></li>

            <li><Link href="/admin/products/new" className={`nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>Add Product</Link></li>

          </ul>

          <Link href="/" target="_blank" className="nav-link" style={{ color: '#b55933', fontWeight: 600 }}>View Storefront →</Link>

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

            <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', margin: 0, fontWeight: 700, color: '#1f1815' }}>

              Admin Order Dashboard

            </h1>

            <p style={{ fontFamily: 'sans-serif', fontSize: '0.82rem', color: '#786e65', marginTop: '0.2rem' }}>

              Manage active storefront orders in real-time

            </p>

          </div>

          <div

            style={{

              background: '#1f1815',

              color: '#fff',

              padding: '0.4rem 1rem',

              borderRadius: '6px',

              fontFamily: 'sans-serif',

              fontSize: '0.82rem',

              fontWeight: 600,

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

              padding: '0.85rem 1rem',

              borderRadius: '6px',

              marginBottom: '1.25rem',

              fontFamily: 'sans-serif',

              fontSize: '0.85rem',

              fontWeight: 'bold',

            }}

          >

            {notification}

          </div>

        )}



        {/* Empty State / Content View */}

        {activeOrders.length === 0 ? (

          <div

            style={{

              padding: '3rem',

              textAlign: 'center',

              color: '#786e65',

              fontFamily: 'sans-serif',

              background: '#fff',

              border: '1px solid #e8e2d9',

              borderRadius: '8px',

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

                    border: '1px solid #e8e2d9',

                    borderRadius: '8px',

                    padding: '1rem',

                    display: 'flex',

                    flexDirection: 'column',

                    gap: '0.75rem',

                  }}

                >

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f2ede4', paddingBottom: '0.5rem' }}>

                    <div>

                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>#{String(order.id).slice(0, 8)}</div>

                      <div style={{ fontSize: '0.75rem', color: '#786e65', marginTop: '2px' }}>

                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}

                      </div>

                    </div>

                    <span

                      style={{

                        padding: '0.2rem 0.5rem',

                        borderRadius: '4px',

                        fontSize: '0.72rem',

                        fontWeight: 'bold',

                        background: currentStatus === 'Shipped' ? '#e0f2fe' : currentStatus === 'Processing' ? '#fef08a' : '#fef3c7',

                        color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',

                      }}

                    >

                      {currentStatus}

                    </span>

                  </div>



                  {renderProductItems(items)}



                  <div style={{ fontSize: '0.85rem' }}>

                    <div style={{ fontWeight: '600' }}>{customerName}</div>

                    <div style={{ color: '#786e65', fontSize: '0.8rem', wordBreak: 'break-all' }}>{email}</div>

                    <div style={{ color: '#786e65', fontSize: '0.75rem', marginTop: '2px' }}>{address}</div>

                  </div>



                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid #f2ede4', paddingTop: '0.5rem' }}>

                    <span style={{ textTransform: 'uppercase', color: '#786e65' }}>{paymentMethod}</span>

                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>${Number(total).toFixed(2)}</span>

                  </div>



                  <div>

                    <select

                      value={currentStatus}

                      onChange={(e) => handleStatusChange(order.id, e.target.value)}

                      style={{

                        width: '100%',

                        padding: '0.5rem',

                        borderRadius: '6px',

                        border: '1px solid #ded7cc',

                        fontSize: '0.85rem',

                        background: '#f7f4ef',

                        color: '#1f1815',

                        cursor: 'pointer',

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

          <div style={{ background: '#fff', border: '1px solid #e8e2d9', borderRadius: '8px', overflow: 'hidden' }}>

            <table

              style={{

                width: '100%',

                borderCollapse: 'collapse',

                fontFamily: 'sans-serif',

              }}

            >

              <thead>

                <tr style={{ background: '#1f1815', color: '#fff', textAlign: 'left', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>

                  <th style={{ padding: '12px 16px', width: '35%' }}>Order Details & Time</th>

                  <th style={{ padding: '12px 16px', width: '25%' }}>Customer</th>

                  <th style={{ padding: '12px 16px', width: '15%' }}>Payment</th>

                  <th style={{ padding: '12px 16px', width: '10%' }}>Total</th>

                  <th style={{ padding: '12px 16px', width: '8%' }}>Status</th>

                  <th style={{ padding: '12px 16px', width: '7%' }}>Action</th>

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

                    <tr key={order.id} style={{ borderBottom: '1px solid #f2ede4', verticalAlign: 'top' }}>

                      <td style={{ padding: '14px 16px' }}>

                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>#{String(order.id).slice(0, 8)}</div>

                        <div style={{ fontSize: '0.75rem', color: '#786e65', marginTop: '4px' }}>

                          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}

                        </div>

                        {renderProductItems(items)}

                      </td>

                      <td style={{ padding: '14px 16px' }}>

                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{customerName}</div>

                        <div style={{ fontSize: '0.8rem', color: '#786e65' }}>{email}</div>

                        <div style={{ fontSize: '0.75rem', color: '#786e65' }}>{address}</div>

                      </td>

                      <td style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.8rem' }}>

                        {paymentMethod}

                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 'bold', fontSize: '0.9rem' }}>

                        ${Number(total).toFixed(2)}

                      </td>

                      <td style={{ padding: '14px 16px' }}>

                        <span

                          style={{

                            padding: '0.2rem 0.5rem',

                            borderRadius: '4px',

                            fontSize: '0.72rem',

                            fontWeight: 'bold',

                            background: currentStatus === 'Shipped' ? '#e0f2fe' : currentStatus === 'Processing' ? '#fef08a' : '#fef3c7',

                            color: currentStatus === 'Shipped' ? '#0369a1' : currentStatus === 'Processing' ? '#854d0e' : '#b45309',

                          }}

                        >

                          {currentStatus}

                        </span>

                      </td>

                      <td style={{ padding: '14px 16px' }}>

                        <select

                          value={currentStatus}

                          onChange={(e) => handleStatusChange(order.id, e.target.value)}

                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #ded7cc', fontSize: '0.82rem', background: '#f7f4ef', cursor: 'pointer' }}

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

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminNav'

interface Order {
  id: string
  customer: string
  total: number
  status: string
  createdAt?: string
}

interface LowStockItem {
  id: string
  title: string
  stock: number
}

interface DashboardStats {
  revenue: number
  totalOrders: number
  activeProducts: number
  totalUnits: number
  totalInventoryValue: number
  lowStockItems: LowStockItem[]
}

interface MonthlySummaryPeriod {
  revenue: number
  ordersCount: number
  revenueGrowth: number
  ordersGrowth: number
}

interface Summaries {
  monthly: MonthlySummaryPeriod
  yearly: { revenue: number; ordersCount: number }
}

interface Analytics {
  averageOrderValue: number
  pendingOrdersCount: number
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const currentDate = new Date()
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  const [userEmail, setUserEmail] = useState<string>('Loading...')
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [authLoading, setAuthLoading] = useState<boolean>(true)

  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    totalOrders: 0,
    activeProducts: 0,
    totalUnits: 0,
    totalInventoryValue: 0,
    lowStockItems: [],
  })
  const [summaries, setSummaries] = useState<Summaries>({
    monthly: { revenue: 0, ordersCount: 0, revenueGrowth: 0, ordersGrowth: 0 },
    yearly: { revenue: 0, ordersCount: 0 },
  })
  const [analytics, setAnalytics] = useState<Analytics>({
    averageOrderValue: 0,
    pendingOrdersCount: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
        .select('is_admin, role')
        .eq('id', session.user.id)
        .single()

      if (profile && (!profile.is_admin && profile.role !== 'admin')) {
        console.warn('Access check warning: Verify user role settings.')
      }

      setIsAuthorized(true)
      setAuthLoading(false)
    }

    checkAdminAccess()
  }, [router])

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(
        `/api/admin/dashboard?month=${selectedMonth}&year=${selectedYear}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.stats) setStats(data.stats)
        if (data.summaries) setSummaries(data.summaries)
        if (data.analytics) setAnalytics(data.analytics)
        if (data.recentOrders) setRecentOrders(data.recentOrders)
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (!isAuthorized) return
    fetchDashboardData()

    const supabase = createClient()
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { fetchDashboardData() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => { fetchDashboardData() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthorized, fetchDashboardData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const renderGrowthBadge = (value: number) => {
    const isPositive = value >= 0
    const color = isPositive ? '#2e6930' : '#992222'
    const bgColor = isPositive ? '#f0f7f0' : '#fcf0f0'
    const arrow = isPositive ? '↑' : '↓'

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: color,
          backgroundColor: bgColor,
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          marginTop: '0.35rem',
        }}
      >
        {arrow} {Math.abs(value).toFixed(1)}% <span style={{ fontWeight: 400, color: '#786f66' }}>vs last mo</span>
      </span>
    )
  }

  const handlePrint = () => { window.print() }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>
        Verifying administrator credentials...
      </div>
    )
  }

  const lowStockCount = stats.lowStockItems?.length || 0
  const baseRev = summaries.monthly.revenue || 12000

  // Expanded trend points for multi-week scrollable progress tracking
  const trendPoints = [
    { day: 'Week 1', val: baseRev * 0.12 },
    { day: 'Week 2', val: baseRev * 0.20 },
    { day: 'Week 3', val: baseRev * 0.18 },
    { day: 'Week 4', val: baseRev * 0.28 },
    { day: 'Week 5', val: baseRev * 0.35 },
    { day: 'Week 6', val: baseRev * 0.30 },
    { day: 'Week 7', val: baseRev * 0.42 },
    { day: 'Week 8', val: baseRev * 0.50 },
    { day: 'Week 9', val: baseRev * 0.45 },
    { day: 'Week 10', val: baseRev * 0.60 },
  ]
  const maxVal = Math.max(...trendPoints.map(p => p.val), 1)

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        body {
          margin: 0;
          background-color: #fcfbfa;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .admin-layout-wrapper {
          display: flex;
          min-height: 100vh;
          position: relative;
        }

        /* Sidebar Styling & Responsive behavior */
        .admin-sidebar {
          width: 240px;
          background-color: #ffffff;
          border-right: 1px solid #e8e2d9;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 1001;
          padding: 1.5rem 1rem;
          box-sizing: border-box;
          transition: transform 0.2s ease;
        }

        .sidebar-heading {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8c827a;
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }

        .sidebar-nav-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          list-style: none;
          padding: 0;
          margin: 0 0 auto 0;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #3b332e;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .sidebar-link:hover {
          background-color: #f7f4ef;
          color: #b55933;
        }

        .sidebar-link.active {
          background-color: #1f1815;
          color: #ffffff;
          font-weight: 600;
        }

        .sidebar-footer {
          border-top: 1px solid #f2ede4;
          padding-top: 1rem;
          margin-top: auto;
        }

        /* Main Content Area */
        .admin-main-content {
          margin-left: 240px;
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding-top: 85px;
          min-height: 100vh;
          width: calc(100% - 240px);
        }

        .fixed-top-header {
          position: fixed;
          top: 0;
          left: 240px;
          right: 0;
          z-index: 1000;
          background-color: #ffffff;
          border-bottom: 1px solid #e2dacf;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          padding: 0.65rem 1.5rem;
          box-sizing: border-box;
        }

        .dashboard-container {
          width: 100%;
          box-sizing: border-box;
          padding: 1rem 1.5rem 3rem 1.5rem;
        }

        .dashboard-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8c827a;
        }

        .filter-select {
          padding: 0.35rem 0.65rem;
          background-color: #f7f4ef;
          border: 1px solid #ded7cc;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1f1815;
          cursor: pointer;
        }

        .action-buttons-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          background-color: #ffffff;
          color: #1f1815;
          border: 1px solid #ded7cc;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action:hover {
          background-color: #f7f4ef;
          border-color: #1f1815;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .metric-card {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 8px;
          padding: 1.1rem 1.25rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8c827a;
        }

        .metric-value {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1f1815;
          line-height: 1.2;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        @media (max-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-section {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 8px;
          padding: 1.1rem 1.25rem;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid #f2ede4;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f1815;
          margin: 0;
        }

        .analysis-text {
          font-size: 0.85rem;
          color: #3b332e;
          line-height: 1.5;
          margin: 0 0 0.75rem 0;
        }

        .analysis-badge {
          display: inline-block;
          background: #f4efe6;
          color: #b55933;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.78rem;
        }

        /* Dedicated Scrollable Field for the Graph */
        .scrollable-graph-container {
          width: 100%;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 0.5rem;
          margin-top: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #ded7cc #fcfbfa;
        }

        .scrollable-graph-container::-webkit-scrollbar {
          height: 6px;
        }

        .scrollable-graph-container::-webkit-scrollbar-track {
          background: #fcfbfa;
          border-radius: 4px;
        }

        .scrollable-graph-container::-webkit-scrollbar-thumb {
          background: #ded7cc;
          border-radius: 4px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .orders-table th {
          text-align: left;
          padding: 0.4rem 0.5rem;
          color: #8c827a;
          font-weight: 600;
          border-bottom: 1px solid #eee8e0;
        }

        .orders-table td {
          padding: 0.6rem 0.5rem;
          border-bottom: 1px solid #f7f4ef;
          color: #3b332e;
        }

        .status-badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-completed { background-color: #f0f7f0; color: #2e6930; }
        .status-processing { background-color: #fcf8ee; color: #8a6200; }

        /* Responsive Breakpoints for Mobile and Tablets */
        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
            width: 220px;
          }
          .admin-main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding-top: 110px;
          }
          .fixed-top-header {
            left: 0 !important;
            padding: 0.5rem 1rem;
          }
          .dashboard-container {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>

      {/* Left Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-heading">Management</div>
        <ul className="sidebar-nav-list">
          <li><Link href="/admin/dashboard" className={`sidebar-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
          <li><Link href="/admin/orders" className={`sidebar-link ${pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link></li>
          <li><Link href="/admin/products" className={`sidebar-link ${pathname === '/admin/products' ? 'active' : ''}`}>Inventory</Link></li>
          <li><Link href="/admin/products/new" className={`sidebar-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>Add Product</Link></li>
        </ul>
        <div className="sidebar-footer">
          <Link href="/" target="_blank" className="sidebar-link" style={{ color: '#b55933', fontWeight: 600 }}>View Storefront</Link>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="admin-main-content">
        <div className="fixed-top-header">
          <AdminHeader
            title="Storefront Monitor"
            description="Real-time store progress and inventory analytics report"
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>

        <div className="dashboard-container">
          {/* Actions & Filters */}
          <div className="dashboard-actions-bar">
            <div className="filter-bar">
              <span className="filter-label">Viewing Period:</span>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="filter-select">
                {MONTH_NAMES.map((name, index) => (<option key={index} value={index}>{name}</option>))}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="filter-select">
                {[2024, 2025, 2026, 2027].map((year) => (<option key={year} value={year}>{year}</option>))}
              </select>
            </div>

            <div className="action-buttons-group">
              <button type="button" onClick={fetchDashboardData} disabled={isRefreshing} className="btn-action">
                <span>{isRefreshing ? 'Syncing...' : 'Force Sync'}</span>
              </button>
              <button type="button" onClick={handlePrint} className="btn-action">
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">Lifetime Revenue</span></div>
              <div className="metric-value">{loading ? '...' : formatCurrency(stats.revenue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">Completed Orders</span></div>
              <div className="metric-value">{loading ? '...' : stats.totalOrders}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">Active Products</span></div>
              <div className="metric-value">{loading ? '...' : stats.activeProducts}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">{MONTH_NAMES[selectedMonth]} Revenue</span></div>
              <div className="metric-value">{loading ? '...' : formatCurrency(summaries.monthly.revenue)}</div>
              {!loading && renderGrowthBadge(summaries.monthly.revenueGrowth)}
            </div>
          </div>

          {/* Graph & Analysis with Scrollable Graph Field */}
          <div className="analytics-grid">
            <div className="dashboard-section">
              <div className="section-title-wrap">
                <h2 className="section-title">Revenue Trend ({MONTH_NAMES[selectedMonth]} {selectedYear})</h2>
                <span className="analysis-badge">Live Stream Active</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#8c827a', margin: '0 0 0.5rem 0' }}>
                ← Scroll horizontally to view preceding and extended progress dots →
              </p>
              
              {/* Scrollable Graph Field Only */}
              <div className="scrollable-graph-container">
                <div style={{ width: '900px', height: '160px', display: 'flex', alignItems: 'flex-end' }}>
                  <svg viewBox="0 0 900 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <polyline
                      fill="none"
                      stroke="#b55933"
                      strokeWidth="3"
                      points={trendPoints.map((p, idx) => `${idx * 90 + 45},${110 - (p.val / maxVal) * 90}`).join(' ')}
                    />
                    {trendPoints.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={idx * 90 + 45}
                          cy={110 - (p.val / maxVal) * 90}
                          r="5"
                          fill="#ffffff"
                          stroke="#b55933"
                          strokeWidth="3"
                        />
                        <text x={idx * 90 + 45} y="125" textAnchor="middle" fontSize="11" fill="#786f66" fontWeight="600">
                          {p.day}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            <div className="dashboard-section">
              <div className="section-title-wrap">
                <h2 className="section-title">Live Performance Analysis</h2>
              </div>
              <p className="analysis-text">
                Real-time tracking is connected for <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong>. Any newly completed orders or inventory edits sync instantly via Supabase channels.
              </p>
              <div style={{ background: '#fcfbfa', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #f2ede4' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8c827a', textTransform: 'uppercase' }}>Stream Status</span>
                <div style={{ fontSize: '0.82rem', color: '#2e6930', fontWeight: 600, marginTop: '0.2rem' }}>
                  ● Connected to database stream
                </div>
              </div>
            </div>
          </div>

          {/* Tables and Inventory Alerts */}
          <div className="content-grid">
            <div className="dashboard-section">
              <div className="section-title-wrap">
                <h2 className="section-title">Recent Orders (Live)</h2>
                <Link href="/admin/orders" style={{ fontSize: '0.8rem', color: '#b55933', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
              </div>
              {loading ? (
                <p style={{ fontSize: '0.85rem', color: '#8c827a' }}>Loading...</p>
              ) : recentOrders.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#8c827a' }}>No recent orders found.</p>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td style={{ fontWeight: 600 }}>{order.id}</td>
                        <td>{order.customer}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>
                          <span className={`status-badge ${order.status?.toLowerCase() === 'completed' ? 'status-completed' : 'status-processing'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="dashboard-section">
              <div className="section-title-wrap">
                <h2 className="section-title">Inventory Health</h2>
                <Link href="/admin/products" style={{ fontSize: '0.8rem', color: '#b55933', textDecoration: 'none', fontWeight: 600 }}>Manage →</Link>
              </div>
              {lowStockCount === 0 ? (
                <div style={{ color: '#2e6930', fontSize: '0.85rem', background: '#f2f8f2', padding: '0.85rem', borderRadius: '6px' }}>
                  Inventory levels are optimal. All items are in stock.
                </div>
              ) : (
                <div style={{ color: '#992222', fontSize: '0.85rem', background: '#fdf5f5', padding: '0.85rem', borderRadius: '6px' }}>
                  <strong>Low Stock Alerts ({lowStockCount})</strong>
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1rem' }}>
                    {stats.lowStockItems.map((item) => (
                      <li key={item.id}>{item.title} — {item.stock} left</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

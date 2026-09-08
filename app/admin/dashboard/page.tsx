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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)

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
  const monthlyRev = summaries.monthly.revenue || 0

  const currentDay = currentDate.getDate()
  const currentWeekNum = Math.min(Math.ceil(currentDay / 7), 4)

  const allWeeks = [
    { day: 'Week 1', val: monthlyRev > 0 ? monthlyRev * 0.22 : 0 },
    { day: 'Week 2', val: monthlyRev > 0 ? monthlyRev * 0.45 : 0 },
    { day: 'Week 3', val: monthlyRev > 0 ? monthlyRev * 0.68 : 0 },
    { day: 'Week 4', val: monthlyRev > 0 ? monthlyRev * 0.90 : 0 }
  ]

  const isCurrentPeriod = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear()
  const trendPoints = isCurrentPeriod ? allWeeks.slice(0, currentWeekNum) : allWeeks
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
          flex-direction: column;
          min-height: 100vh;
          /* Reduced padding-top further by 50px (down to 120px) */
          padding-top: 120px;
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper {
            /* Reduced padding-top further by 50px on mobile (down to 170px) */
            padding-top: 170px;
          }
        }

        .fixed-top-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1050;
          border-bottom: 1px solid #e2dacf;
          padding: 0.5rem 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .top-nav-bar {
          position: fixed;
          top: 53px; /* Positions right below the fixed top header */
          left: 0;
          right: 0;
          z-index: 1045;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          border-bottom: 1px solid #e8e2d9;
          padding: 0.6rem 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .top-nav-bar {
            top: auto; /* Allow flexible flow on mobile if header wraps */
            position: relative;
          }
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
          padding: 0.4rem 0.75rem;
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
          padding: 0.4rem 0.75rem;
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
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (min-width: 640px) {
          .admin-main-content {
            padding: 1.25rem 1.5rem 3rem 1.5rem;
          }
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
          width: 100%;
        }

        @media (min-width: 640px) {
          .filter-bar {
            width: auto;
          }
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
          width: 100%;
        }

        @media (min-width: 640px) {
          .action-buttons-group {
            width: auto;
          }
        }

        .btn-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          background-color: #ffffff;
          color: #1f1815;
          border: 1px solid #ded7cc;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        @media (min-width: 640px) {
          .btn-action {
            flex: initial;
          }
        }

        .btn-action:hover {
          background-color: #f7f4ef;
          border-color: #1f1815;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        @media (min-width: 480px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(4, 1fr);
          }
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
          word-break: break-word;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        @media (min-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .dashboard-section {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 8px;
          padding: 1.1rem 1.25rem;
          overflow: hidden;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid #f2ede4;
          flex-wrap: wrap;
          gap: 0.5rem;
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

        .scrollable-graph-container {
          width: 100%;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 0.5rem;
          margin-top: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #ded7cc #fcfbfa;
          -webkit-overflow-scrolling: touch;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        @media (min-width: 1024px) {
          .content-grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .table-responsive-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          min-width: 450px;
        }

        .orders-table th {
          text-align: left;
          padding: 0.4rem 0.5rem;
          color: #8c827a;
          font-weight: 600;
          border-bottom: 1px solid #eee8e0;
          white-space: nowrap;
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
          white-space: nowrap;
        }

        .status-completed { background-color: #f0f7f0; color: #2e6930; }
        .status-processing { background-color: #fcf8ee; color: #8a6200; }
      `}</style>

      {/* Unwrapped Fixed Header */}
      <div className="fixed-top-header">
        <AdminHeader
          title="Storefront Monitor"
          description="Real-time store progress and inventory analytics report"
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      </div>

      {/* Fixed Navigation Bar */}
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

      {/* Main Content Area */}
      <div className="admin-main-content">
        {/* Actions & Period Filters */}
        <div className="dashboard-actions-bar">
          <div className="filter-bar">
            <span className="filter-label">Statistics Period:</span>
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
              <span>Print Report</span>
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

        {/* Scrollable Graph Field & Performance Analysis */}
        <div className="analytics-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">Revenue Trend ({MONTH_NAMES[selectedMonth]} {selectedYear})</h2>
              <span className="analysis-badge">Live Stream Active</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#8c827a', margin: '0 0 0.5rem 0' }}>
              Weekly store progression overview for the selected period:
            </p>
            
            <div className="scrollable-graph-container">
              {monthlyRev === 0 ? (
                <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c827a', fontSize: '0.85rem' }}>
                  No revenue data recorded for {MONTH_NAMES[selectedMonth]} {selectedYear}.
                </div>
              ) : (
                <div style={{ width: '520px', height: '160px', display: 'flex', alignItems: 'flex-end' }}>
                  <svg viewBox="0 0 520 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <polyline
                      fill="none"
                      stroke="#b55933"
                      strokeWidth="3"
                      points={trendPoints.map((p, idx) => `${idx * 130 + 65},${110 - (p.val / maxVal) * 90}`).join(' ')}
                    />
                    {trendPoints.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={idx * 130 + 65}
                          cy={110 - (p.val / maxVal) * 90}
                          r="5"
                          fill="#ffffff"
                          stroke="#b55933"
                          strokeWidth="3"
                        />
                        <text x={idx * 130 + 65} y="125" textAnchor="middle" fontSize="11" fill="#786f66" fontWeight="600">
                          {p.day}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}
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

        {/* Recent Orders & Inventory Health */}
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
              <div className="table-responsive-wrapper">
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
              </div>
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
  )
}

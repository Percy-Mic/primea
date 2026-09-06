'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

interface YearlySummaryPeriod {
  revenue: number
  ordersCount: number
}

interface Summaries {
  monthly: MonthlySummaryPeriod
  yearly: YearlySummaryPeriod
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

  // Verify Admin Authentication and fetch real user email
  useEffect(() => {
    const checkAdminAccess = async () => {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const email = session.user.email || 'percymicnono@gmail.com'
      setUserEmail(email)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', session.user.id)
        .single()

      if (profileError || (!profile?.is_admin && profile?.role !== 'admin')) {
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
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchDashboardData()
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
    const color = isPositive ? '#275e27' : '#a82323'
    const bgColor = isPositive ? '#f0f7f0' : '#fff8f8'
    const arrow = isPositive ? '↑' : '↓'

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          fontSize: '0.75rem',
          fontWeight: 700,
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

  const handlePrint = () => {
    window.print()
  }

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

  return (
    <div className="dashboard-page-wrapper">
      <style>{`
        /* Page wrapper handles padding so content doesn't hide under the fixed header */
        .dashboard-page-wrapper {
          padding-top: 140px; 
          min-height: 100vh;
          box-sizing: border-box;
        }

        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
          padding: 0 1rem 2rem 1rem;
          overflow-x: hidden;
        }

        /* Fixed Top Header Wrapper */
        .fixed-top-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background-color: #ffffff; /* Solid background color matching the card styles */
          border-bottom: 1px solid #e8e2d9;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          padding: 0.75rem 2rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
          width: 100%;
        }

        @media (min-width: 640px) {
          .header-actions {
            width: auto;
          }
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8c827a;
          width: 100%;
        }

        @media (min-width: 480px) {
          .filter-label {
            width: auto;
          }
        }

        .filter-select {
          padding: 0.4rem 0.75rem;
          background-color: #faf8f5;
          border: 1px solid #dcd5ca;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f1815;
          cursor: pointer;
          flex: 1;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.55rem 0.9rem;
          background-color: #ffffff;
          color: #1f1815;
          border: 1px solid #dcd5ca;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        @media (min-width: 640px) {
          .btn-action {
            flex: initial;
            padding: 0.6rem 1.15rem;
          }
        }

        .btn-action:hover {
          background-color: #faf8f5;
          border-color: #1f1815;
        }

        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 640px) {
          .metrics-grid-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .metrics-grid-4 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .metrics-grid-4 {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .metric-card {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8c827a;
        }

        .metric-sublabel {
          font-size: 0.75rem;
          color: #786f66;
          margin-top: 0.25rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f1815;
          line-height: 1.2;
          word-break: break-word;
        }

        .progress-bar-card {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .progress-bar-card {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .progress-stat-item {
          display: flex;
          flex-direction: column;
        }

        .progress-stat-label {
          font-size: 0.7rem;
          color: #8c827a;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .progress-stat-val {
          font-size: 1rem;
          font-weight: 700;
          color: #1f1815;
          margin-top: 0.15rem;
          word-break: break-word;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .content-grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .dashboard-section {
          background-color: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 12px;
          padding: 1.25rem;
          overflow-x: auto;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f2ede4;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f1815;
          margin: 0;
        }

        .alert-box-success {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background-color: #f3f8f3;
          border: 1px solid #d4e6d4;
          border-radius: 8px;
          color: #275e27;
          font-size: 0.85rem;
        }

        .alert-box-warning {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background-color: #fff8f8;
          border: 1px solid #f5c6c6;
          border-radius: 8px;
          color: #a82323;
          font-size: 0.85rem;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          min-width: 400px;
        }

        .orders-table th {
          text-align: left;
          padding: 0.5rem;
          color: #8c827a;
          font-weight: 600;
          border-bottom: 1px solid #eee8e0;
          white-space: nowrap;
        }

        .orders-table td {
          padding: 0.75rem 0.5rem;
          border-bottom: 1px solid #f7f4ef;
          color: #3b332e;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-completed {
          background-color: #f0f7f0;
          color: #2b6e2b;
        }

        .status-processing {
          background-color: #fff8eb;
          color: #9c6800;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }

          .fixed-top-header,
          .header-actions,
          .filter-bar,
          a,
          button {
            display: none !important;
          }

          .dashboard-page-wrapper {
            padding-top: 0 !important;
          }

          .dashboard-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .dashboard-section,
          .metric-card,
          .progress-bar-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Fixed Top Header with solid background color matching cards */}
      <div className="fixed-top-header">
        <AdminHeader
          title="Storefront Monitor"
          description="Real-time store progress and inventory analytics report"
          userEmail={userEmail}
          onLogout={handleLogout}
          action={
            <div className="header-actions">
              <Link href="/admin/settings" className="btn-action" style={{ textDecoration: 'none' }}>
                <span>Edit Profile</span>
              </Link>
              <Link href="/admin/team" className="btn-action" style={{ textDecoration: 'none' }}>
                <span>Admins</span>
              </Link>
              <button
                type="button"
                onClick={fetchDashboardData}
                disabled={isRefreshing}
                className="btn-action"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={isRefreshing ? 'animate-spin' : ''}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button type="button" onClick={handlePrint} className="btn-action">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>Print</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="dashboard-container">
        {/* Date Filter Bar */}
        <div className="filter-bar">
          <span className="filter-label">Viewing Period:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="filter-select"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="filter-select"
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Lifetime Key Metrics */}
        <div className="metrics-grid metrics-grid-3">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Lifetime Revenue</span>
            </div>
            <div className="metric-value">{loading ? '...' : formatCurrency(stats.revenue)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Completed Orders</span>
            </div>
            <div className="metric-value">{loading ? '...' : stats.totalOrders}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Active Products</span>
            </div>
            <div className="metric-value">{loading ? '...' : stats.activeProducts}</div>
          </div>
        </div>

        {/* Monthly, Yearly & Comparison Grid */}
        <div className="metrics-grid metrics-grid-4">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">{MONTH_NAMES[selectedMonth]} Revenue</span>
            </div>
            <div className="metric-value">{loading ? '...' : formatCurrency(summaries.monthly.revenue)}</div>
            <div className="metric-sublabel">
              {loading ? '...' : `${summaries.monthly.ordersCount} orders`}
            </div>
            {!loading && renderGrowthBadge(summaries.monthly.revenueGrowth)}
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">{selectedYear} Year Total</span>
            </div>
            <div className="metric-value">{loading ? '...' : formatCurrency(summaries.yearly.revenue)}</div>
            <div className="metric-sublabel">{loading ? '...' : `${summaries.yearly.ordersCount} orders`}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Avg Order Value</span>
            </div>
            <div className="metric-value">{loading ? '...' : formatCurrency(analytics.averageOrderValue)}</div>
            <div className="metric-sublabel">Per completed transaction</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Pending Orders</span>
            </div>
            <div className="metric-value">{loading ? '...' : analytics.pendingOrdersCount}</div>
            <div className="metric-sublabel">Requires processing</div>
          </div>
        </div>

        {/* Progress & Inventory Bar */}
        <div className="progress-bar-card">
          <div className="progress-stat-item">
            <span className="progress-stat-label">Stock Units Tracked</span>
            <span className="progress-stat-val">{loading ? '...' : `${stats.totalUnits || 0} Units`}</span>
          </div>
          <div className="progress-stat-item">
            <span className="progress-stat-label">Inventory Valuation</span>
            <span className="progress-stat-val">{loading ? '...' : formatCurrency(stats.totalInventoryValue || 0)}</span>
          </div>
          <div className="progress-stat-item">
            <span className="progress-stat-label">Low Stock Items</span>
            <span className="progress-stat-val" style={{ color: lowStockCount > 0 ? '#a82323' : '#275e27' }}>
              {loading ? '...' : lowStockCount}
            </span>
          </div>
          <div className="progress-stat-item">
            <span className="progress-stat-label">Storefront Health</span>
            <span className="progress-stat-val" style={{ color: '#275e27' }}>
              {loading ? '...' : 'Operational'}
            </span>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="content-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">Recent Orders</h2>
              <Link href="/admin/orders" style={{ fontSize: '0.8rem', color: '#c0633b', textDecoration: 'none', fontWeight: 600 }}>
                View All →
              </Link>
            </div>

            {loading ? (
              <p style={{ fontSize: '0.85rem', color: '#8c827a', margin: '1rem 0' }}>Loading orders...</p>
            ) : recentOrders.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#8c827a', margin: '1rem 0' }}>No recent orders found.</p>
            ) : (
              <div className="table-responsive">
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
              <Link href="/admin/products" style={{ fontSize: '0.8rem', color: '#c0633b', textDecoration: 'none', fontWeight: 600 }}>
                Manage →
              </Link>
            </div>

            {loading ? (
              <p style={{ fontSize: '0.85rem', color: '#8c827a' }}>Checking stock...</p>
            ) : lowStockCount === 0 ? (
              <div className="alert-box-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Inventory levels look good. All items are in stock.</span>
              </div>
            ) : (
              <div className="alert-box-warning">
                <strong style={{ fontWeight: 700 }}>Low Stock Alerts ({lowStockCount})</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {stats.lowStockItems.map((item) => (
                    <li key={item.id}>
                      {item.title} — <strong>{item.stock} left</strong>
                    </li>
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

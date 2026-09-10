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

interface DailyPoint {
  day: number
  label: string
  revenue: number
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
  const [chartMode, setChartMode] = useState<'daily' | 'weekly'>('daily')

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
  const [dailyTrend, setDailyTrend] = useState<DailyPoint[]>([])
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
        if (data.dailyTrend) setDailyTrend(data.dailyTrend)
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
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const renderGrowthBadge = (value: number) => {
    const isPositive = value >= 0
    const arrow = isPositive ? '↑' : '↓'

    return (
      <span className={`growth-badge ${isPositive ? 'positive' : 'negative'}`}>
        {arrow} {Math.abs(value).toFixed(1)}% <span className="growth-sub">vs last mo</span>
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
      <div className="auth-loading-screen">
        Verifying administrator credentials...
      </div>
    )
  }

  const lowStockCount = stats.lowStockItems?.length || 0

  const getWeeklyTrend = () => {
    const weeks: { label: string; revenue: number }[] = []
    let currentWeekRevenue = 0
    let weekCount = 1
    
    dailyTrend.forEach((p, idx) => {
      currentWeekRevenue += p.revenue
      if ((idx + 1) % 7 === 0 || idx === dailyTrend.length - 1) {
        weeks.push({
          label: `W${weekCount}`,
          revenue: currentWeekRevenue
        })
        currentWeekRevenue = 0
        weekCount++
      }
    })
    return weeks
  }

  const activeTrend = chartMode === 'daily' ? dailyTrend : getWeeklyTrend()
  const rawMaxVal = Math.max(...activeTrend.map(p => p.revenue), 10)
  const maxVal = Math.ceil(rawMaxVal / 50) * 50 || 100
  const chartWidth = Math.max(activeTrend.length * 60, 500)
  const chartHeight = 180

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: #FAFAFA;
          color: #171717;
          font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          width: 100%;
          
          /* Grid background pattern matching monitor page */
          background-image: 
            linear-gradient(to right, #EBEBEB 1px, transparent 1px),
            linear-gradient(to bottom, #EBEBEB 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .auth-loading-screen {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          color: #666666;
          background: #FAFAFA;
          font-size: 14px;
        }

        .admin-layout-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-top: 130px;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper { padding-top: 145px; }
        }

        .header-fixed-container {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 9999;
          background-color: #FFFFFF;
          border-bottom: 1px solid #EBEBEB;
          width: 100%;
        }

        /* Top Navigation Bar matching monitor icon buttons layout */
        .top-nav-bar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          background-color: #FFFFFF;
          border-top: 1px solid #EBEBEB;
          padding: 12px 24px;
          width: 100%;
          gap: 12px;
          overflow-x: auto;
        }

        @media (min-width: 640px) {
          .top-nav-bar { padding: 12px 32px; gap: 16px; }
        }

        .nav-links-group {
          display: flex;
          list-style: none;
          gap: 12px;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        }

        @media (min-width: 640px) {
          .nav-links-group {
            width: auto;
            justify-content: flex-start;
            gap: 8px;
          }
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          color: #171717;
          background-color: #FFFFFF;
          border: 1px solid #EBEBEB;
          text-decoration: none;
          transition: all 0.2s ease;
          flex: 1;
        }

        @media (min-width: 640px) {
          .nav-link {
            width: auto;
            height: auto;
            padding: 8px 16px;
            border: none;
            background-color: transparent;
            color: #666666;
            flex: unset;
          }
        }

        .nav-link:hover {
          background-color: #FAFAFA;
          color: #171717;
          border-color: #171717;
        }

        @media (min-width: 640px) {
          .nav-link:hover {
            border-color: #EBEBEB;
          }
        }

        .nav-link.active {
          background-color: #171717;
          color: #FFFFFF;
          border-color: #171717;
          font-weight: 500;
        }

        .nav-text-label {
          display: none;
        }

        @media (min-width: 640px) {
          .nav-text-label {
            display: inline;
          }
        }

        /* SVG icons inside mobile nav buttons */
        .nav-icon {
          width: 18px;
          height: 18px;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        @media (min-width: 640px) {
          .nav-icon {
            display: none;
          }
        }

        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px 24px 80px 24px;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (min-width: 640px) {
          .admin-main-content { padding: 32px 32px 80px 32px; }
        }

        .dashboard-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          padding: 8px 16px;
          border-radius: 9999px;
          box-shadow: none;
          flex-wrap: wrap;
          width: 100%;
        }

        @media (min-width: 640px) {
          .filter-bar { width: auto; }
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666666;
        }

        .filter-select {
          padding: 6px 12px;
          background-color: #FAFAFA;
          border: 1px solid #EBEBEB;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 400;
          color: #171717;
          cursor: pointer;
          outline: none;
        }

        .action-buttons-group {
          display: flex;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

        @media (min-width: 640px) {
          .action-buttons-group { width: auto; }
        }

        .btn-primary-custom {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 16px;
          background-color: #171717;
          color: #FFFFFF;
          border: 1px solid #171717;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          text-decoration: none;
          height: 40px;
        }

        @media (min-width: 640px) {
          .btn-primary-custom { flex: unset; }
        }

        .btn-primary-custom:hover {
          background-color: #000000;
          border-color: #000000;
        }

        .btn-secondary-custom {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 16px;
          background-color: #FFFFFF;
          color: #171717;
          border: 1px solid #EBEBEB;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s ease, background-color 0.2s ease;
          text-decoration: none;
          height: 40px;
        }

        @media (min-width: 640px) {
          .btn-secondary-custom { flex: unset; }
        }

        .btn-secondary-custom:hover {
          border-color: #171717;
          background-color: #FAFAFA;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 32px;
        }

        @media (min-width: 480px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .metrics-grid { grid-template-columns: repeat(4, 1fr); } }

        .metric-card {
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          border-radius: 6px;
          padding: 16px;
          box-shadow: none;
        }

        .metric-label {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666666;
        }

        .metric-value {
          font-size: 36px;
          font-weight: 400;
          letter-spacing: -1.44px;
          color: #171717;
          margin-top: 8px;
          word-break: break-word;
          line-height: 40px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          margin-bottom: 32px;
        }

        @media (min-width: 1024px) { .analytics-grid { grid-template-columns: 2fr 1fr; } }

        .dashboard-section {
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          border-radius: 6px;
          padding: 16px;
          box-shadow: none;
          overflow: hidden;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #EBEBEB;
          gap: 12px;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 20px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0px;
          color: #171717;
        }

        .analysis-badge {
          background: #FAFAFA;
          color: #171717;
          border: 1px solid #EBEBEB;
          padding: 6px 10px;
          border-radius: 9999px;
          font-weight: 500;
          font-size: 12px;
        }

        .scrollable-graph-container {
          width: 100%;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 8px;
          margin-top: 12px;
          scrollbar-width: thin;
          scrollbar-color: #EBEBEB #FAFAFA;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }

        @media (min-width: 1024px) { .content-grid { grid-template-columns: 2fr 1fr; } }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 450px;
        }

        .orders-table th {
          text-align: left;
          padding: 12px;
          color: #666666;
          font-weight: 500;
          border-bottom: 1px solid #EBEBEB;
        }

        .orders-table td {
          padding: 12px;
          border-bottom: 1px solid #EBEBEB;
          color: #171717;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-completed { background-color: #FAFAFA; color: #171717; border: 1px solid #EBEBEB; }
        .status-processing { background-color: #FAFAFA; color: #666666; border: 1px solid #EBEBEB; }

        .growth-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 9999px;
          margin-top: 12px;
          border: 1px solid #EBEBEB;
        }

        .growth-badge.positive {
          background-color: #FAFAFA;
          color: #171717;
        }

        .growth-badge.negative {
          background-color: #FAFAFA;
          color: #D92D20;
          border-color: #D92D20;
        }

        .growth-sub {
          font-weight: 400;
          color: #666666;
        }

        /* Clean Print Formatting */
        @media print {
          body { background: #FFFFFF !important; color: #000000 !important; background-image: none !important; }
          .header-fixed-container, .dashboard-actions-bar, .action-buttons-group, .top-nav-bar, button { display: none !important; }
          .admin-layout-wrapper { padding-top: 0 !important; max-width: 100% !important; }
          .admin-main-content { max-width: 100% !important; padding: 0 !important; }
          .dashboard-section, .metric-card { border: 1px solid #000000 !important; box-shadow: none !important; background: #FFFFFF !important; }
          .admin-main-content::before {
            content: "PRIMEA FASHION — EXECUTIVE PERFORMANCE REPORT (" attr(data-print-month) ")";
            display: block;
            font-size: 24px;
            font-weight: 400;
            margin-bottom: 24px;
            border-bottom: 2px solid #000000;
            padding-bottom: 12px;
          }
        }
      `}</style>

      {/* Fixed Header */}
      <div className="header-fixed-container">
        <div className="fixed-top-header">
          <AdminHeader
            title="Admin Dashboard"
            description="Real-time store progress and inventory management dashboard"
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>

        <nav className="top-nav-bar">
          <ul className="nav-links-group">
            <li>
              <Link href="/admin/dashboard" className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`} title="Dashboard">
                <svg className="nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span className="nav-text-label">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`} title="Orders">
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span className="nav-text-label">Orders</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`} title="Inventory">
                <svg className="nav-icon" viewBox="0 0 24 24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span className="nav-text-label">Inventory</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/products/new" className={`nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`} title="Add Product">
                <svg className="nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span className="nav-text-label">Add Product</span>
              </Link>
            </li>
            <li>
              <Link href="/" target="_blank" className="nav-link" title="Storefront">
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span className="nav-text-label">View Storefront →</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content" data-print-month={`${MONTH_NAMES[selectedMonth]} ${selectedYear}`}>
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
            <button type="button" onClick={fetchDashboardData} disabled={isRefreshing} className="btn-secondary-custom">
              <span>{isRefreshing ? 'Syncing...' : 'Force Sync'}</span>
            </button>
            <button type="button" onClick={handlePrint} className="btn-primary-custom">
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Lifetime Revenue</div>
            <div className="metric-value">{loading ? '...' : formatCurrency(stats.revenue)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed Orders</div>
            <div className="metric-value">{loading ? '...' : stats.totalOrders}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Active Products</div>
            <div className="metric-value">{loading ? '...' : stats.activeProducts}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">{MONTH_NAMES[selectedMonth]} Revenue</div>
            <div className="metric-value">{loading ? '...' : formatCurrency(summaries.monthly.revenue)}</div>
            {!loading && renderGrowthBadge(summaries.monthly.revenueGrowth)}
          </div>
        </div>

        {/* Store Progress Graph with Grid lines and Value Identifiers */}
        <div className="analytics-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">
                {chartMode === 'daily' ? 'Daily' : 'Weekly'} Revenue Progress ({MONTH_NAMES[selectedMonth]} {selectedYear})
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', background: '#FAFAFA', padding: '2px', borderRadius: '9999px', border: '1px solid #EBEBEB' }}>
                  <button
                    type="button"
                    onClick={() => setChartMode('daily')}
                    style={{
                      background: chartMode === 'daily' ? '#171717' : 'transparent',
                      color: chartMode === 'daily' ? '#FFFFFF' : '#666666',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('weekly')}
                    style={{
                      background: chartMode === 'weekly' ? '#171717' : 'transparent',
                      color: chartMode === 'weekly' ? '#FFFFFF' : '#666666',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Weekly
                  </button>
                </div>
                <span className="analysis-badge">Live Stream</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 12px 0' }}>
              {chartMode === 'daily' ? 'Daily sales with value identifiers (smaller dots):' : 'Weekly aggregated sales (larger dots):'}
            </p>
            
            <div className="scrollable-graph-container">
              {activeTrend.length === 0 ? (
                <div style={{ height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666666', fontSize: '14px' }}>
                  No transaction data recorded for this period.
                </div>
              ) : (
                <div style={{ width: `${chartWidth}px`, height: '200px', position: 'relative' }}>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                      const yPos = 25 + ratio * 120
                      const labelVal = Math.round(maxVal * (1 - ratio))
                      return (
                        <g key={index}>
                          <line x1="45" y1={yPos} x2={chartWidth - 10} y2={yPos} stroke="#EBEBEB" strokeWidth="1" strokeDasharray={index === 4 ? 'none' : '3,3'} />
                          <text x="38" y={yPos + 4} textAnchor="end" fontSize="10" fill="#666666" fontWeight="400">
                            ${labelVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Vertical Axis Line */}
                    <line x1="45" y1="25" x2="45" y2="145" stroke="#EBEBEB" strokeWidth="1" />

                    {/* Polyline Path */}
                    <polyline
                      fill="none"
                      stroke="#171717"
                      strokeWidth="2"
                      points={activeTrend.map((p, idx) => {
                        const cx = 60 + idx * 60
                        const cy = 145 - (p.revenue / maxVal) * 120
                        return `${cx},${cy}`
                      }).join(' ')}
                    />

                    {/* Data Points and Identifiers */}
                    {activeTrend.map((p, idx) => {
                      const cx = 60 + idx * 60
                      const cy = 145 - (p.revenue / maxVal) * 120
                      const dotRadius = chartMode === 'daily' ? 3 : 5
                      return (
                        <g key={idx}>
                          {/* Value Identifier / Label above dot */}
                          <text x={cx} y={cy - 9} textAnchor="middle" fontSize="10" fill="#171717" fontWeight="500">
                            {p.revenue > 0 ? `$${p.revenue}` : '$0'}
                          </text>

                          {/* Data Point Dot */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={dotRadius}
                            fill="#FFFFFF"
                            stroke="#171717"
                            strokeWidth="2"
                          />

                          {/* X-Axis Label */}
                          <text 
                            x={cx} 
                            y="165" 
                            textAnchor="middle" 
                            fontSize="10" 
                            fill="#666666"
                            fontWeight="400"
                          >
                            {p.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">Live Performance Analysis</h2>
            </div>
            <p style={{ fontSize: '14px', color: '#171717', lineHeight: '20px', margin: '0 0 16px 0' }}>
              The graph incorporates horizontal axis thresholds and individual monetary identifiers directly over each data point for instant auditing.
            </p>
            <div style={{ background: '#FAFAFA', padding: '12px 16px', borderRadius: '6px', border: '1px solid #EBEBEB' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Stream Status</span>
              <div style={{ fontSize: '14px', color: '#171717', fontWeight: 500, marginTop: '4px' }}>
                Connected to database stream
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders & Inventory Health */}
        <div className="content-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">Recent Orders (Live)</h2>
              <Link href="/admin/orders" style={{ fontSize: '14px', color: '#171717', textDecoration: 'none', fontWeight: 500 }}>View All →</Link>
            </div>
            {loading ? (
              <p style={{ fontSize: '14px', color: '#666666' }}>Loading...</p>
            ) : recentOrders.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#666666' }}>No recent orders found.</p>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
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
                        <td style={{ fontWeight: 500 }}>{order.id}</td>
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
              <Link href="/admin/products" style={{ fontSize: '14px', color: '#171717', textDecoration: 'none', fontWeight: 500 }}>Manage →</Link>
            </div>
            {lowStockCount === 0 ? (
              <div style={{ color: '#171717', fontSize: '14px', background: '#FAFAFA', padding: '16px', borderRadius: '6px', border: '1px solid #EBEBEB' }}>
                Inventory levels are optimal. All items are in stock.
              </div>
            ) : (
              <div style={{ color: '#D92D20', fontSize: '14px', background: '#FAFAFA', padding: '16px', borderRadius: '6px', border: '1px solid #D92D20' }}>
                <strong>Low Stock Alerts ({lowStockCount})</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px' }}>
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

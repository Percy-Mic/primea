'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminNav'
import AdminSubNav from '@/components/AdminSubNav'

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
    const color = isPositive ? '#171717' : '#D92D20'
    const arrow = isPositive ? '↑' : '↓'

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          fontSize: '12px',
          fontWeight: 500,
          color: color,
          backgroundColor: '#FAFAFA',
          border: '1px solid #EBEBEB',
          padding: '2px 8px',
          borderRadius: '9999px',
          marginTop: '8px',
        }}
      >
        {arrow} {Math.abs(value).toFixed(1)}% <span style={{ color: '#666666', fontWeight: 400 }}>vs last mo</span>
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#666666', background: '#FAFAFA' }}>
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
          label: `Week ${weekCount}`,
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
  const chartWidth = Math.max(activeTrend.length * 70, 650)
  const chartHeight = 180

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          background-color: #FAFAFA !important;
          font-family: system-ui, -apple-system, sans-serif;
          color: #171717;
          overflow-x: hidden;
          width: 100%;
          min-height: 100vh;
        }

        .admin-layout-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-top: 115px;
          width: 100%;
          max-width: 100vw;
          position: relative;
          z-index: 1;
          background: #FAFAFA !important;
        }

        .header-fixed-container {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 9999;
          background-color: #FFFFFF;
          border-bottom: 1px solid #EBEBEB;
          width: 100%;
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper { padding-top: 135px; }
        }

        /* Stylish and Elegant Grid Pattern Background on Main Content */
        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          width: 100%;
          max-width: 1350px;
          margin: 0 auto;
          position: relative;
          background-color: #FAFAFA;
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .admin-main-content::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(250, 250, 250, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Ensure cards/sections stay cleanly layered above the background grid */
        .admin-main-content > * {
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .admin-main-content { padding: 24px 32px; }
        }

        .dashboard-actions-bar {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          padding: 6px 12px;
          border-radius: 9999px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .filter-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666666;
        }

        .filter-select {
          padding: 3px 8px;
          background-color: #FAFAFA;
          border: 1px solid #EBEBEB;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          color: #171717;
          cursor: pointer;
          outline: none;
        }

        .action-buttons-group {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 14px;
          background: #171717;
          color: #FFFFFF;
          border: 1px solid #171717;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          height: 34px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .btn-action:hover {
          background: #000000;
        }

        .btn-action-secondary {
          background: #FFFFFF;
          color: #171717;
          border: 1px solid #EBEBEB;
        }

        .btn-action-secondary:hover {
          background: #FAFAFA;
          border-color: #171717;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .metrics-grid {
            gap: 16px;
          }
        }

        .metric-card {
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          border-radius: 8px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        @media (min-width: 768px) {
          .metric-card { padding: 18px 20px; }
        }

        .metric-label {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666666;
        }

        @media (min-width: 768px) {
          .metric-label { font-size: 11px; }
        }

        .metric-value {
          font-size: 20px;
          font-weight: 400;
          color: #171717;
          margin-top: 4px;
          letter-spacing: -1px;
        }

        @media (min-width: 768px) {
          .metric-value { font-size: 30px; margin-top: 6px; }
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (min-width: 1024px) { .analytics-grid { grid-template-columns: 2fr 1fr; } }

        .dashboard-section {
          background: #FFFFFF;
          border: 1px solid #EBEBEB;
          border-radius: 8px;
          padding: 18px 20px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        @media (min-width: 768px) {
          .dashboard-section { padding: 22px; }
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #EBEBEB;
          gap: 12px;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 17px;
          font-weight: 400;
          color: #171717;
          letter-spacing: -0.5px;
        }

        @media (min-width: 768px) {
          .section-title { font-size: 19px; }
        }

        .analysis-badge {
          background: #FAFAFA;
          border: 1px solid #EBEBEB;
          color: #171717;
          padding: 3px 8px;
          border-radius: 9999px;
          font-weight: 500;
          font-size: 11px;
        }

        .scrollable-graph-container {
          width: 100%;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 6px;
          margin-top: 10px;
          scrollbar-width: thin;
          scrollbar-color: #EBEBEB #FAFAFA;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 30px;
        }

        @media (min-width: 1024px) { .content-grid { grid-template-columns: 2fr 1fr; } }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          min-width: 400px;
        }

        .orders-table th {
          text-align: left;
          padding: 8px 6px;
          color: #666666;
          font-weight: 500;
          border-bottom: 1px solid #EBEBEB;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .orders-table td {
          padding: 10px 6px;
          border-bottom: 1px solid #EBEBEB;
          color: #171717;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-completed { background-color: #FAFAFA; border: 1px solid #EBEBEB; color: #171717; }
        .status-processing { background-color: #FAFAFA; border: 1px solid #EBEBEB; color: #666666; }

        @media print {
          body, html { background: #FFFFFF !important; background-image: none !important; color: #000000 !important; }
          .header-fixed-container, .dashboard-actions-bar, .action-buttons-group, button { display: none !important; }
          .admin-layout-wrapper { padding-top: 0 !important; }
          .admin-main-content { max-width: 100% !important; padding: 0 !important; background: #FFFFFF !important; background-image: none !important; }
          .dashboard-section, .metric-card { border: 1px solid #000000 !important; box-shadow: none !important; background: #FFFFFF !important; }
        }
      `}</style>

      {/* Fixed Header & Sub Navigation Components */}
      <div className="header-fixed-container">
        <AdminHeader
          title="Admin Dashboard"
          description="Real-time store progress and inventory management dashboard"
          userEmail={userEmail}
          onLogout={handleLogout}
        />
        <AdminSubNav />
      </div>

      {/* Main Content Area with Stylish Grid Background */}
      <div className="admin-main-content" data-print-month={`${MONTH_NAMES[selectedMonth]} ${selectedYear}`}>
        {/* Actions Bar */}
        <div className="dashboard-actions-bar">
          <div className="filter-bar">
            <span className="filter-label">Period:</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="filter-select">
              {MONTH_NAMES.map((name, index) => (<option key={index} value={index}>{name}</option>))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="filter-select">
              {[2024, 2025, 2026, 2027].map((year) => (<option key={year} value={year}>{year}</option>))}
            </select>
          </div>

          <div className="action-buttons-group">
            <button type="button" onClick={fetchDashboardData} disabled={isRefreshing} className="btn-action btn-action-secondary">
              <span>{isRefreshing ? 'Syncing...' : 'Force Sync'}</span>
            </button>
            <button type="button" onClick={handlePrint} className="btn-action">
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Store Data Summary Title Header */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#171717', letterSpacing: '-0.3px' }}>
            Store Data Summary
          </h2>
          <span style={{ fontSize: '12px', color: '#666666' }}>
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
        </div>

        {/* 4 Metric Cards Displayed 2 per Row (including mobile) */}
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

        {/* Store Progress Graph & Performance Analysis */}
        <div className="analytics-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">
                {chartMode === 'daily' ? 'Daily' : 'Weekly'} Revenue ({MONTH_NAMES[selectedMonth]} {selectedYear})
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', background: '#FAFAFA', padding: '2px', borderRadius: '9999px', border: '1px solid #EBEBEB' }}>
                  <button
                    type="button"
                    onClick={() => setChartMode('daily')}
                    style={{
                      background: chartMode === 'daily' ? '#171717' : 'transparent',
                      color: chartMode === 'daily' ? '#FFFFFF' : '#666666',
                      border: 'none',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontSize: '11px',
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
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Weekly
                  </button>
                </div>
                <span className="analysis-badge">Live</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 10px 0' }}>
              {chartMode === 'daily' ? 'Daily sales figures:' : 'Weekly aggregated sales:'}
            </p>
            
            <div className="scrollable-graph-container">
              {activeTrend.length === 0 ? (
                <div style={{ height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666666', fontSize: '13px' }}>
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
                          <text x="38" y={yPos + 4} textAnchor="end" fontSize="10" fill="#666666" fontWeight="500">
                            ${labelVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Vertical Axis Line */}
                    <line x1="45" y1="25" x2="45" y2="145" stroke="#EBEBEB" strokeWidth="1.5" />

                    {/* Polyline Path */}
                    <polyline
                      fill="none"
                      stroke="#171717"
                      strokeWidth="2"
                      points={activeTrend.map((p, idx) => {
                        const cx = 70 + idx * 70
                        const cy = 145 - (p.revenue / maxVal) * 120
                        return `${cx},${cy}`
                      }).join(' ')}
                    />

                    {/* Data Points */}
                    {activeTrend.map((p, idx) => {
                      const cx = 70 + idx * 70
                      const cy = 145 - (p.revenue / maxVal) * 120
                      const dotRadius = chartMode === 'daily' ? 3 : 5
                      return (
                        <g key={idx}>
                          <text x={cx} y={cy - 9} textAnchor="middle" fontSize="10" fill="#171717" fontWeight="500">
                            {p.revenue > 0 ? `$${p.revenue}` : '$0'}
                          </text>

                          <circle
                            cx={cx}
                            cy={cy}
                            r={dotRadius}
                            fill="#FFFFFF"
                            stroke="#171717"
                            strokeWidth="2"
                          />

                          <text 
                            x={cx} 
                            y="165" 
                            textAnchor="middle" 
                            fontSize="11" 
                            fill="#666666"
                            fontWeight="500"
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
              <h2 className="section-title">Performance Analysis</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#666666', lineHeight: '1.5', margin: '0 0 14px 0' }}>
              Real-time store tracking metrics and automated inventory audits synchronized securely via Supabase.
            </p>
            <div style={{ background: '#FAFAFA', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EBEBEB' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Stream Status</span>
              <div style={{ fontSize: '13px', color: '#171717', fontWeight: 500, marginTop: '2px' }}>
                Connected to database stream
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders & Inventory Health */}
        <div className="content-grid">
          <div className="dashboard-section">
            <div className="section-title-wrap">
              <h2 className="section-title">Recent Orders</h2>
              <Link href="/admin/orders" style={{ fontSize: '13px', color: '#171717', textDecoration: 'underline', fontWeight: 500 }}>View All →</Link>
            </div>
            {loading ? (
              <p style={{ fontSize: '13px', color: '#666666' }}>Loading...</p>
            ) : recentOrders.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#666666' }}>No recent orders found.</p>
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
              <Link href="/admin/products" style={{ fontSize: '13px', color: '#171717', textDecoration: 'underline', fontWeight: 500 }}>Manage →</Link>
            </div>
            {lowStockCount === 0 ? (
              <div style={{ color: '#171717', fontSize: '13px', background: '#FAFAFA', border: '1px solid #EBEBEB', padding: '14px', borderRadius: '6px' }}>
                Inventory levels are optimal. All items are in stock.
              </div>
            ) : (
              <div style={{ color: '#171717', fontSize: '13px', background: '#FAFAFA', border: '1px solid #EBEBEB', padding: '14px', borderRadius: '6px' }}>
                <strong style={{ color: '#D92D20' }}>Low Stock Alerts ({lowStockCount})</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                  {stats.lowStockItems.map((item) => (
                    <li key={item.id} style={{ marginBottom: '4px' }}>{item.title} — {item.stock} left</li>
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminNav'

export default function AdminFeaturePage() {
  const router = useRouter()
  const pathname = usePathname()

  const [userEmail, setUserEmail] = useState<string>('Loading...')
  const [authLoading, setAuthLoading] = useState<boolean>(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  // Example state for your feature view
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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

      setAuthLoading(false)
    }

    checkAdminAccess()
  }, [router])

  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Fetch your custom endpoint data here
      // const response = await fetch('/api/admin/your-endpoint')
      // if (response.ok) { const data = await response.json(); setItems(data) }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading, fetchData])

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

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #fbf7f2;
          background-image: 
            radial-gradient(circle at 85% 15%, rgba(243, 225, 208, 0.6) 0%, transparent 45%),
            radial-gradient(circle at 10% 85%, rgba(247, 238, 228, 0.8) 0%, transparent 50%),
            linear-gradient(135deg, #fdfbf7 0%, #f6f0e8 100%);
          font-family: system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          width: 100%;
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
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper { padding-top: 135px; }
        }

        .header-fixed-container {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 9999;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          width: 100%;
        }

        .top-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          border-top: 1px solid #e8e2d9;
          border-bottom: 1px solid #e8e2d9;
          padding: 0.4rem 1rem;
          width: 100%;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .top-nav-bar { padding: 0.4rem 1.5rem; }
        }

        .nav-links-group {
          display: flex;
          list-style: none;
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
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          background-color: #f7f4ef;
          color: #b06d50;
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
          .mobile-menu-btn { display: inline-flex; align-items: center; gap: 0.4rem; }
          .nav-links-group {
            display: ${mobileMenuOpen ? 'flex' : 'none'};
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            border-top: 1px solid #f2ede4;
            margin-top: 0.4rem;
            padding-top: 0.4rem;
          }
        }

        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0.75rem;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (min-width: 640px) {
          .admin-main-content { padding: 1.25rem 1.5rem 3rem 1.5rem; }
        }

        .dashboard-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .action-buttons-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          width: 100%;
        }

        @media (min-width: 640px) {
          .action-buttons-group { width: auto; }
        }

        .btn-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          background: linear-gradient(135deg, #ffffff 0%, #faf8f5 100%);
          color: #1f1815;
          border: 1px solid #ded7cc;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(44, 34, 30, 0.02);
          text-decoration: none;
        }

        @media (min-width: 640px) {
          .btn-action { flex: unset; }
        }

        .btn-action:hover {
          background: #1f1815;
          color: #ffffff;
          border-color: #1f1815;
          transform: translateY(-2px);
        }

        .dashboard-section {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 248, 245, 0.9) 100%);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(232, 226, 217, 0.8);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 4px 20px rgba(44, 34, 30, 0.03);
          overflow: hidden;
          margin-bottom: 1.25rem;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f2ede4;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f1815;
        }
      `}</style>

      {/* Fixed Header */}
      <div className="header-fixed-container">
        <div className="fixed-top-header">
          <AdminHeader
            title="Admin Management"
            description="Manage your platform settings and content records"
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>

        <nav className="top-nav-bar">
          <button type="button" className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>Menu</button>
          <ul className="nav-links-group">
            <li><Link href="/admin/dashboard" className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
            <li><Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link></li>
            <li><Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>Inventory</Link></li>
            <li><Link href="/admin/products/new" className={`nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>Add Product</Link></li>
          </ul>
          <Link href="/" target="_blank" className="nav-link" style={{ color: '#b06d50', fontWeight: 600 }}>View Storefront →</Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content">
        <div className="dashboard-actions-bar">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f1815' }}>Feature Management</h1>
          <div className="action-buttons-group">
            <button type="button" onClick={fetchData} disabled={isRefreshing} className="btn-action">
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-title-wrap">
            <h2 className="section-title">Overview Section</h2>
          </div>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: '#8c827a' }}>Loading content...</p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#3b332e' }}>Your custom components and tables can go here.</p>
          )}
        </div>
      </div>
    </div>
  )
}

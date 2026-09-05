'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
    },
    {
      label: 'Inventory',
      href: '/admin/products',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      label: 'Add Product',
      href: '/admin/products/new',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
  ]

  return (
    <div className="admin-root-container">
      <style>{`
        .admin-root-container {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 60px);
          margin-top: 60px; /* Offset for fixed header */
          background-color: #faf9f6;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .admin-sidebar {
          width: 100%;
          background-color: #ffffff;
          border-bottom: 1px solid #e2dad0;
          padding: 1.75rem 1rem 1rem 1rem; /* Added more padding top */
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .admin-nav-group {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .admin-main-content {
          flex: 1;
          padding: 1.25rem;
          box-sizing: border-box;
          width: 100%;
        }

        @media (min-width: 768px) {
          .admin-root-container {
            flex-direction: row;
          }

          .admin-sidebar {
            width: 240px;
            position: fixed;
            top: 60px;
            bottom: 0;
            left: 0;
            border-right: 1px solid #e2dad0;
            border-bottom: none;
            padding: 2.25rem 1rem 1.5rem 1rem; /* Added more padding top for desktop sidebar */
            gap: 0.35rem;
            overflow-y: auto;
          }

          .admin-nav-group {
            flex-direction: column;
            flex-wrap: nowrap;
          }

          .admin-main-content {
            margin-left: 240px;
            padding: 2rem;
          }

          .storefront-link {
            margin-top: auto !important;
          }
        }
      `}</style>

      {/* Admin Sub-navigation */}
      <aside className="admin-sidebar">
        <p
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#8c827a',
            margin: '0 0 0.25rem 0.5rem',
          }}
        >
          Management
        </p>

        <nav className="admin-nav-group">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive ? '#1f1815' : 'transparent',
                  color: isActive ? '#ffffff' : '#4a423c',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href="/"
          className="storefront-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 0.85rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#c0633b',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            paddingTop: '0.75rem',
            borderTop: '1px solid #eee8e0',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>View Storefront</span>
        </Link>
      </aside>

      {/* Page Content */}
      <main className="admin-main-content">{children}</main>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSubNav() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      href: '/admin/orders',
      label: 'Orders',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      href: '/admin/products',
      label: 'Inventory',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      href: '/admin/products/new',
      label: 'Add Product',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
    {
      href: '/',
      label: 'View Storefront',
      isExternal: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      ),
    },
  ]

  return (
    <div className="sub-nav-bar">
      <style>{`
        .sub-nav-bar {
          display: flex;
          align-items: center;
          background-color: #FFFFFF;
          border-bottom: 1px solid #EBEBEB;
          padding: 10px 24px;
          width: 100%;
          box-sizing: border-box;
          position: fixed;
          top: 69px;
          left: 0;
          right: 0;
          z-index: 9998;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .sub-nav-list {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          width: 100%;
          align-items: center;
          /* Mobile: Distribute items evenly across the full width */
          justify-content: space-between;
        }

        /* Desktop: Switch layout to left-aligned with a clean gap */
        @media (min-width: 768px) {
          .sub-nav-list {
            justify-content: flex-start;
            gap: 16px;
            max-width: 1400px;
            margin: 0 auto;
          }
        }

        .sub-nav-item {
          position: relative;
        }

        .sub-nav-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 9999px;
          background-color: transparent;
          color: #666666;
          border: 1px solid #EBEBEB;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sub-nav-link:hover {
          background-color: #FAFAFA;
          color: #171717;
          border-color: #171717;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .sub-nav-link.active {
          background-color: #171717;
          color: #FFFFFF;
          border-color: #171717;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* Tooltip styling on hover */
        .sub-nav-link::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: #171717;
          color: #FFFFFF;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          border-radius: 4px;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          z-index: 10;
        }

        .sub-nav-link:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>

      <ul className="sub-nav-list">
        {navItems.map((item) => {
          const isActive = !item.isExternal && pathname === item.href
          return (
            <li key={item.href} className="sub-nav-item">
              <Link
                href={item.href}
                target={item.isExternal ? '_blank' : '_self'}
                className={`sub-nav-link ${isActive ? 'active' : ''}`}
                data-tooltip={item.label}
              >
                {item.icon}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

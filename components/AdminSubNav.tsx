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
          background: #fbf8f3;
          border-bottom: 1px solid #e8dfd4;
          padding: 10px clamp(16px, 3vw, 40px);
          width: 100%;
          box-sizing: border-box;
          position: fixed;
          top: 69px;
          left: 0;
          right: 0;
          z-index: 9998;
          box-shadow: 0 8px 24px rgba(55, 38, 25, 0.045);
        }

        .sub-nav-list {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0 auto;
          width: max-content;
          min-width: 100%;
          max-width: 1440px;
          align-items: center;
          justify-content: flex-start;
          flex-wrap: nowrap;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
        }
        .sub-nav-list::-webkit-scrollbar { display: none; }
        .sub-nav-item { position: relative; flex-shrink: 0; }
        .sub-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 15px;
          border-radius: 8px;
          background: transparent;
          color: #76695d;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 180ms ease;
        }
        .sub-nav-link:hover {
          background: #f1e9df;
          color: #37291f;
          border-color: #e7dbce;
        }
        .sub-nav-link.active {
          background: #33251d;
          color: #fffaf5;
          border-color: #33251d;
          box-shadow: 0 3px 8px rgba(51, 37, 29, .12);
        }
        .sub-nav-link::after { display: none; }

        @media (max-width: 640px) {
          .sub-nav-bar {
            top: 69px;
            padding: 7px 8px;
            overflow: hidden;
          }
          .sub-nav-list {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            flex-wrap: nowrap !important;
            justify-content: flex-start;
            gap: 4px;
            padding: 0 2px 2px;
            overscroll-behavior-x: contain;
            -webkit-overflow-scrolling: touch;
          }
          .sub-nav-item { flex: 0 0 auto; }
          .sub-nav-link {
            min-height: 36px;
            padding: 0 9px;
            font-size: 11px;
            gap: 5px;
            border-radius: 7px;
          }
          .sub-nav-link svg { display: block; width: 16px; height: 16px; flex-shrink: 0; }
          .sub-nav-link span { display: none; }
          .sub-nav-link {
            width: 40px;
            min-width: 40px;
            padding: 0;
            justify-content: center;
            border-radius: 10px;
          }
          .sub-nav-list { justify-content: space-between; }
        }

        @media (min-width: 641px) {
          .sub-nav-link svg { flex-shrink: 0; }
          .sub-nav-link span { display: inline; }
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
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

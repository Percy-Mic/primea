'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <style>{`
        .site-header {
          width: 100%;
          background-color: #1f1815;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
        }

        .nav-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-logo {
          font-family: serif;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #fefdfa;
          text-decoration: none;
        }

        .desktop-nav {
          display: none;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          color: #d1c8bd;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color 0.2s ease;
        }

        .nav-link:hover {
          color: #fefdfa;
        }

        .btn-login {
          border: 1px solid rgba(209, 200, 189, 0.4);
          padding: 0.5rem 1.25rem;
          border-radius: 9999px;
          color: #fefdfa;
        }

        /* Mobile Hamburger Toggle */
        .mobile-toggle {
          display: block;
          background: none;
          border: none;
          color: #fefdfa;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
        }

        /* Mobile Dropdown Menu */
        .mobile-menu {
          display: flex;
          flex-direction: column;
          background-color: #1a1412;
          padding: 1.5rem;
          gap: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-menu .nav-link {
          font-size: 0.85rem;
        }

        @media (min-width: 768px) {
          .desktop-nav {
            display: flex;
          }
          .mobile-toggle,
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>

      <div className="nav-container">
        <Link href="/" className="brand-logo">
          PRIMEA
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link href="/" className="nav-link">
            Storefront
          </Link>
          <Link href="/products" className="nav-link">
            Products
          </Link>
          <Link href="/cart" className="nav-link">
            Cart
          </Link>
          <Link href="/login" className="nav-link btn-login">
            Login
          </Link>
        </nav>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className="mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <nav className="mobile-menu">
          <Link href="/login" className="nav-link btn-login" onClick={() => setIsMenuOpen(false)}>
            Login
          </Link>
        </nav>
      )}
    </header>
  )
}
'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ProductsCatalogContent() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasOrders, setHasOrders] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const searchVal = searchParams?.get('search') || ''
  const sortVal = searchParams?.get('sort') || ''

  // Sync state with URL params when they change
  useEffect(() => {
    setSearch(searchVal)
    setSort(sortVal)
  }, [searchVal, sortVal])

  // Check if the current user has active orders to show the "My Orders" badge link
  useEffect(() => {
    async function checkClientOrders() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!error && data && data.length > 0) {
        setHasOrders(true)
      }
    }

    checkClientOrders()
  }, [supabase])

  const loadProducts = async () => {
    setLoading(true)

    try {
      let query = supabase.from('products').select('*')

      if (searchVal) {
        query = query.ilike('title', `%${searchVal}%`)
      }

      switch (sortVal) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      const { data, error } = await query

      if (!error && data) {
        setProducts(data)
        setLoading(false)
        return
      }
    } catch (e) {
      console.error('Supabase fetch error, trying local storage fallback:', e)
    }

    // Local Storage Fallback
    const saved = localStorage.getItem('products') || localStorage.getItem('elara_products')
    if (saved) {
      try {
        let localData = JSON.parse(saved)

        if (searchVal) {
          localData = localData.filter((p: any) =>
            (p.title || '').toLowerCase().includes(searchVal.toLowerCase())
          )
        }

        if (sortVal === 'price_asc') {
          localData.sort((a: any, b: any) => Number(a.price) - Number(b.price))
        } else if (sortVal === 'price_desc') {
          localData.sort((a: any, b: any) => Number(b.price) - Number(a.price))
        }

        setProducts(localData)
      } catch (e) {
        console.error('Failed to parse local storage products:', e)
        setProducts([])
      }
    } else {
      setProducts([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProducts()

    window.addEventListener('storage', loadProducts)
    return () => window.removeEventListener('storage', loadProducts)
  }, [searchVal, sortVal])

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sort) params.set('sort', sort)
    router.push(`/products?${params.toString()}`)
  }

  const getImageUrl = (product: any) => {
    if (product.image_url) return product.image_url
    if (product.imageUrl) return product.imageUrl
    if (product.image) return product.image
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0]
    return null
  }

  return (
    <div className="storefront-page">
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .storefront-page {
          background-color: #f5f2eb;
          min-height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1f1815;
          padding-top: 65px;
        }
        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 65px;
          background-color: #1f1815;
          color: #f5f2eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          z-index: 1000;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .site-logo {
          font-family: serif;
          font-size: 1.5rem;
          letter-spacing: 3px;
          color: #f5f2eb;
          text-decoration: none;
          font-weight: 600;
        }
        .desktop-nav {
          display: none;
          align-items: center;
          gap: 1.75rem;
        }
        .nav-link {
          color: #c5bbb3;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          transition: color 0.2s ease;
        }
        .nav-link:hover {
          color: #fefdfa;
        }
        .btn-login {
          border: 1px solid rgba(245, 242, 235, 0.3);
          padding: 0.4rem 1rem;
          border-radius: 20px;
          color: #fefdfa;
        }
        .btn-orders {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(245, 242, 235, 0.2);
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          color: #fefdfa !important;
        }
        .order-dot {
          width: 5px;
          height: 5px;
          background-color: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          border-radius: 50%;
        }
        .menu-toggle {
          background: none;
          border: none;
          color: #f5f2eb;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
        }
        .mobile-dropdown {
          position: fixed;
          top: 65px;
          left: 0;
          width: 100%;
          background-color: #1f1815;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          z-index: 999;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .mobile-nav-link {
          color: #c5bbb3;
          text-decoration: none;
          font-size: 0.85rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 500;
        }
        .mobile-nav-link:hover {
          color: #fefdfa;
        }
        .mobile-btn-login {
          border: 1px solid rgba(245, 242, 235, 0.3);
          padding: 0.65rem;
          border-radius: 20px;
          text-align: center;
          color: #fefdfa;
          margin-top: 0.25rem;
        }
        .mobile-btn-orders {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(245, 242, 235, 0.2);
          padding: 0.65rem 1rem;
          border-radius: 20px;
          color: #fefdfa !important;
        }
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex;
          }
          .menu-toggle,
          .mobile-dropdown {
            display: none !important;
          }
        }
        .hero-banner {
          background-color: #1f1815;
          color: #f5f2eb;
          text-align: center;
          padding: 3rem 1.5rem;
        }
        .hero-title {
          font-family: serif;
          font-size: 2.25rem;
          margin-bottom: 0.75rem;
          font-weight: 400;
        }
        .hero-subtitle {
          color: #c5bbb3;
          font-size: 0.95rem;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .catalog-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.25rem;
        }
        .catalog-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
          .catalog-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .catalog-title {
          font-family: serif;
          font-size: 2rem;
          font-weight: 400;
        }
        .controls-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .control-input, .control-select {
          flex: 1 1 130px;
          background: #ffffff;
          border: 1px solid #e2dad0;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          outline: none;
        }
        .btn-apply {
          background-color: #1f1815;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1.1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-reset {
          color: #786e65;
          text-decoration: none;
          font-size: 0.85rem;
          padding: 0.25rem;
        }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .product-card {
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2dad0;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }
        .image-wrapper {
          position: relative;
          width: 100%;
          height: 300px;
          background-color: #e2dad0;
        }
        .product-info {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .product-name {
          font-size: 1rem;
          font-weight: 600;
        }
        .product-price {
          font-size: 0.95rem;
          color: #b06d50;
          font-weight: 700;
        }
      `}</style>

      {/* Navigation Header */}
      <header className="site-header">
        <Link href="/" className="site-logo">
          PRIMEA
        </Link>
        
        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          <Link href="/" className="nav-link">Storefront</Link>
          <Link href="/products" className="nav-link">Products</Link>
          <Link href="/cart" className="nav-link">Cart</Link>
          {hasOrders && (
            <Link href="/orders" className="nav-link btn-orders">
              <span className="order-dot"></span>
              My Orders
            </Link>
          )}
          <Link href="/login" className="nav-link btn-login">Login</Link>
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <nav className="mobile-dropdown">
          <Link href="/" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
            Storefront
          </Link>
          <Link href="/products" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
            Products
          </Link>
          <Link href="/cart" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
            Cart
          </Link>
          {hasOrders && (
            <Link href="/orders" className="mobile-nav-link mobile-btn-orders" onClick={() => setMenuOpen(false)}>
              <span className="order-dot"></span>
              My Orders
            </Link>
          )}
          <Link href="/login" className="mobile-nav-link mobile-btn-login" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
        </nav>
      )}
      
      {/* Hero Banner */}
      <section className="hero-banner">
        <h1 className="hero-title">All Products</h1>
        <p className="hero-subtitle">
          Curated luxury fashion and high-quality artisanal pieces delivered to your door.
        </p>
      </section>

      {/* Main Catalog View */}
      <main className="catalog-container">
        <div className="catalog-header">
          <h2 className="catalog-title">Catalog</h2>

          <form onSubmit={handleApplyFilters} className="controls-bar">
            <input
              type="text"
              name="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="control-input"
            />

            <select
              name="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="control-select"
            >
              <option value="">Sort: Default</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            <button type="submit" className="btn-apply">
              Apply
            </button>

            {(search || sort) && (
              <Link
                href="/products"
                onClick={() => {
                  setSearch('')
                  setSort('')
                }}
                className="btn-reset"
              >
                Reset
              </Link>
            )}
          </form>
        </div>

        {/* Dynamic Grid Listing */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#786e65' }}>
            Loading catalog...
          </div>
        ) : products && products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => {
              const src = getImageUrl(product)
              return (
                <Link key={product.id} href={`/products/${product.id}`} className="product-card">
                  <div className="image-wrapper">
                    {src ? (
                      <Image
                        src={src}
                        alt={product.title || 'Product Image'}
                        fill
                        unoptimized
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#786e65' }}>
                        No Image Available
                      </div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.title || 'Untitled Product'}</h3>
                    <div className="product-price">${Number(product.price || 0).toFixed(2)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#786e65' }}>
            No products found matching your search.
          </div>
        )}
      </main>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading catalog...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  )
}
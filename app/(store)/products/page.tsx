'use client'

import React, { useState, useEffect } from 'react'
// import UserNav from '@/components/UserNav'

interface Product {
  id: string
  title: string
  category?: string
  price: number
  description?: string
  image_url?: string
  image?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : data.products || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filteredProducts = products
    .filter((product) =>
      product.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'low-high') return a.price - b.price
      if (sortBy === 'high-low') return b.price - a.price
      return 0
    })

  return (
    <>
      {/* Fixed Header Container with UserNav commented out */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          backgroundColor: '#16120f',
          borderBottom: '1px solid #2a221e',
          minHeight: '60px', // Temporary placeholder height so you can see the empty header block
        }}
      >
        {/* <UserNav brandName="PRIMEA" /> */}
      </header>

      {/* Main Content */}
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#faf8f5',
          paddingTop: '110px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
          color: '#1f1815',
          fontFamily: 'serif',
        }}
      >
        <style>{`
          .product-grid {
            display: grid;
            grid-template-columns: repeat(1, minmax(0, 1fr));
            gap: 32px;
          }
          @media (min-width: 640px) {
            .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (min-width: 1024px) {
            .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          }

          .controls-bar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 40px;
          }
          @media (min-width: 640px) {
            .controls-bar {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
            }
          }

          .product-card {
            background-color: #ffffff;
            border: 1px solid #e8e2d9;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px -8px rgba(31, 24, 21, 0.1);
          }

          .add-btn {
            width: 100%;
            background-color: #1f1815;
            color: #ffffff;
            border: none;
            padding: 12px;
            border-radius: 6px;
            font-family: sans-serif;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          .add-btn:hover {
            background-color: #3b302a;
          }
        `}</style>

        {/* Header Banner */}
        <section
          style={{
            maxWidth: '1200px',
            margin: '10px auto 40px auto',
            textAlign: 'center',
            paddingBottom: '32px',
            borderBottom: '1px solid #e2dad0',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: '#786e65',
              fontWeight: 600,
              display: 'block',
              marginBottom: '8px',
              fontFamily: 'sans-serif',
            }}
          >
            Curated Luxury
          </span>
          <h1
            style={{
              fontSize: '2.5rem',
              margin: '0 0 12px 0',
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            All Products
          </h1>
          <p
            style={{
              color: '#786e65',
              fontSize: '15px',
              maxWidth: '520px',
              margin: '0 auto',
              fontFamily: 'sans-serif',
              lineHeight: '1.5',
            }}
          >
            Explore our carefully curated selection of timeless artisanal pieces.
          </p>
        </section>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Controls Bar */}
          <div className="controls-bar">
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2dad0',
                padding: '10px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                outline: 'none',
                width: '100%',
                maxWidth: '280px',
                fontFamily: 'sans-serif',
              }}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2dad0',
                padding: '10px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              <option value="featured">Featured</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>
          </div>

          {/* Product Layout Grid */}
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 0',
                color: '#786e65',
                fontFamily: 'sans-serif',
              }}
            >
              Loading collection...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2dad0',
                borderRadius: '8px',
                color: '#786e65',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              }}
            >
              No products found in your inventory.
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const imgSrc =
                  product.image_url || product.image || '/placeholder.png'

                return (
                  <div key={product.id} className="product-card">
                    {/* Product Image */}
                    <div
                      style={{
                        aspectRatio: '1/1',
                        backgroundColor: '#f5f2ed',
                        overflow: 'hidden',
                        width: '100%',
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={product.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* Card Info Container */}
                    <div
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flexGrow: 1,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: '#1f1815',
                          }}
                        >
                          {product.title}
                        </h3>

                        {/* Star Rating Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            color: '#a03b1e',
                            fontFamily: 'sans-serif',
                            marginBottom: '12px',
                          }}
                        >
                          <span>★ 5.0</span>
                          <span style={{ color: '#786e65' }}>(0 reviews)</span>
                        </div>

                        {/* Price Display */}
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: '#a03b1e',
                            fontFamily: 'sans-serif',
                            marginBottom: '12px',
                          }}
                        >
                          ${Number(product.price).toFixed(2)}
                        </div>

                        {/* Description */}
                        <p
                          style={{
                            fontSize: '13px',
                            color: '#786e65',
                            fontFamily: 'sans-serif',
                            margin: '0 0 20px 0',
                            lineHeight: '1.4',
                          }}
                        >
                          {product.description || 'Exclusive luxury item.'}
                        </p>
                      </div>

                      {/* Action Button */}
                      <button className="add-btn">Add to Cart</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

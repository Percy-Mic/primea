'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/UserNav'

interface Product {
  id: string
  title: string
  price: number
  description?: string
  image_url?: string
  image?: string
  stock?: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [notification, setNotification] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*')
        if (error) throw error
        setProducts(data || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const savedCart = JSON.parse(localStorage.getItem('elara_cart') || '[]')
      const existingIndex = savedCart.findIndex((item: any) => item.id === product.id)
      const imageUrl = product.image_url || product.image || ''

      if (existingIndex > -1) {
        savedCart[existingIndex].quantity = (savedCart[existingIndex].quantity || 1) + 1
      } else {
        savedCart.push({
          id: product.id,
          title: product.title,
          price: product.price,
          image: imageUrl,
          quantity: 1,
          stock: product.stock,
        })
      }

      localStorage.setItem('elara_cart', JSON.stringify(savedCart))
      window.dispatchEvent(new Event('cartUpdated'))

      setNotification(`Added "${product.title}" to your shopping bag.`)
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error saving to cart:', error)
    }
  }

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
    <div
      style={{
        backgroundColor: '#f5f2eb',
        minHeight: '100vh',
        paddingTop: '85px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1f1815',
        position: 'relative',
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 2rem;
        }
        @media (min-width: 640px) {
          .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
      `}</style>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '95px',
            right: '24px',
            zIndex: 1100,
            backgroundColor: '#1f1815',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {notification}
        </div>
      )}

      {/* Reusable Navbar Component */}
      <Navbar />

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'serif', fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 400 }}>
            Curated Collection
          </h1>
          <p style={{ color: '#786e65', fontSize: '0.95rem' }}>Explore our selection of timeless pieces.</p>
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e2dad0',
              background: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              flex: '1',
              maxWidth: '300px',
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e2dad0',
              background: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="featured">Featured</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#786e65' }}>Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2dad0' }}>
            <p style={{ color: '#786e65' }}>No products found matching your search.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => {
              const imgSrc = product.image_url || product.image || '/placeholder.png'
              return (
                <div
                  key={product.id}
                  onClick={() => router.push(`/products/${product.id}`)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2dad0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#eae4d8' }}>
                    <Image
                      src={imgSrc}
                      alt={product.title}
                      fill
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1f1815' }}>
                        {product.title}
                      </h3>
                      <p style={{ color: '#b06d50', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      style={{
                        width: '100%',
                        background: '#1f1815',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

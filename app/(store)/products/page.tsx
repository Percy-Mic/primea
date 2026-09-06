'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

interface Product {
  id: string
  title: string
  category?: string
  price: number
  description?: string
  image_url?: string
  image?: string
}

export default function ProductDetailsPage() {
  const params = useParams()
  const id = params?.id

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadProductDetails() {
      try {
        const res = await fetch(`/api/products/${id}`)
        const data = await res.json()
        // Handles if the API returns the item directly or wrapped in an object
        setProduct(data.product || data)
      } catch (err) {
        console.error('Failed to load product details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProductDetails()
  }, [id])

  // Functional Add to Cart Handler (Aligned with your catalog page implementation)
  const handleAddToCart = () => {
    if (!product) return

    try {
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]')
      const productIndex = existingCart.findIndex((item: any) => item.id === product.id)

      if (productIndex > -1) {
        existingCart[productIndex].quantity = (existingCart[productIndex].quantity || 1) + 1
      } else {
        existingCart.push({ ...product, quantity: 1 })
      }

      localStorage.setItem('cart', JSON.stringify(existingCart))
      
      // Trigger temporary visual toast notification
      setNotification(`Added "${product.title}" to your shopping bag!`)
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error saving to cart:', error)
    }
  }

  const imgSrc = product ? (product.image_url || product.image || '/placeholder.png') : '/placeholder.png'

  return (
    <div style={{ backgroundColor: '#faf8f5', minHeight: '100vh', position: 'relative' }}>
      {/* Toast Notification Banner */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 1100,
            backgroundColor: '#1f1815',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {notification}
        </div>
      )}

      {/* Isolated Fixed Header */}
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
        }}
      >
        <UserNav brandName="PRIMEA" />
      </header>

      {/* Main Content View with Safe Padding-Top */}
      <main
        style={{
          paddingTop: '140px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
          color: '#1f1815',
          fontFamily: 'serif',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <style>{`
          .product-detail-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
          }
          @media (min-width: 768px) {
            .product-detail-grid {
              grid-template-columns: 1fr 1fr;
              gap: 60px;
              align-items: start;
            }
          }

          .add-btn {
            width: 100%;
            background-color: #1f1815;
            color: #ffffff;
            border: none;
            padding: 16px;
            border-radius: 6px;
            font-family: sans-serif;
            font-size: 14px;
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

        {/* Back Link */}
        <div style={{ marginBottom: '24px', fontFamily: 'sans-serif', fontSize: '13px' }}>
          <Link href="/products" style={{ color: '#786e65', textDecoration: 'none' }}>
            ← Back to All Products
          </Link>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              color: '#786e65',
              fontFamily: 'sans-serif',
            }}
          >
            Loading product details...
          </div>
        ) : !product ? (
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
            Product not found.
          </div>
        ) : (
          <div className="product-detail-grid">
            {/* Product Image Frame */}
            <div
              style={{
                aspectRatio: '1/1',
                backgroundColor: '#f5f2ed',
                overflow: 'hidden',
                width: '100%',
                borderRadius: '12px',
                border: '1px solid #e8e2d9',
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

            {/* Product Info Section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <h1
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '2.25rem',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: '#1f1815',
                }}
              >
                {product.title}
              </h1>

              {/* Ratings */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: '#a03b1e',
                  fontFamily: 'sans-serif',
                  marginBottom: '16px',
                }}
              >
                <span>★ 5.0</span>
                <span style={{ color: '#786e65' }}>(0 reviews)</span>
              </div>

              {/* Price */}
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#a03b1e',
                  fontFamily: 'sans-serif',
                  marginBottom: '20px',
                }}
              >
                ${Number(product.price).toFixed(2)}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '15px',
                  color: '#786e65',
                  fontFamily: 'sans-serif',
                  margin: '0 0 32px 0',
                  lineHeight: '1.6',
                }}
              >
                {product.description || 'Exclusive luxury item crafted with meticulous attention to detail.'}
              </p>

              {/* Functional Add to Cart Button */}
              <button
                className="add-btn"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

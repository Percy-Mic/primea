'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface CartItem {
  id: string
  title: string
  price: number
  quantity: number
  stock?: number
  image?: string
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const loadCart = useCallback(async () => {
    try {
      const savedCart: CartItem[] = JSON.parse(localStorage.getItem('elara_cart') || '[]')

      if (savedCart.length > 0) {
        const productIds = savedCart.map((item) => item.id)

        // Fetch live stock counts directly from Supabase
        const { data: dbProducts } = await supabase
          .from('products')
          .select('id, stock')
          .in('id', productIds)

        const stockMap = new Map((dbProducts || []).map((p) => [p.id, p.stock]))

        const updatedWithStock = savedCart.map((item) => ({
          ...item,
          stock: stockMap.get(item.id) ?? 0,
        }))

        setCart(updatedWithStock)
      } else {
        setCart([])
      }
    } catch (error) {
      console.error('Failed to load cart:', error)
      setCart([])
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadCart()
    window.addEventListener('cartUpdated', loadCart)
    window.addEventListener('storage', loadCart)

    return () => {
      window.removeEventListener('cartUpdated', loadCart)
      window.removeEventListener('storage', loadCart)
    }
  }, [loadCart])

  const updateQuantity = (id: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const maxStock = item.stock ?? Infinity
          const newQty = item.quantity + delta

          if (delta > 0 && newQty > maxStock) {
            return item
          }

          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      })
      .filter((item): item is CartItem => item !== null)

    setCart(updated)
    localStorage.setItem('elara_cart', JSON.stringify(updated))
    window.dispatchEvent(new Event('cartUpdated'))
  }

  const hasStockIssues = cart.some((item) => item.quantity > (item.stock ?? Infinity))

  const handleCheckout = () => {
    if (hasStockIssues) {
      alert('Some items in your cart exceed available stock. Please adjust quantities.')
      return
    }
    router.push('/checkout')
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (!isLoaded) return null

  return (
    <div
      style={{
        backgroundColor: '#f5f2eb',
        minHeight: '100vh',
        paddingTop: '65px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        color: '#1f1815',
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .site-header {
          position: fixed; top: 0; left: 0; width: 100%; height: 65px;
          background-color: #1f1815; color: #f5f2eb; display: flex;
          align-items: center; justify-content: space-between; padding: 0 1.5rem; z-index: 1000;
        }
        .site-logo {
          font-family: serif; font-size: 1.5rem; letter-spacing: 3px;
          color: #f5f2eb; text-decoration: none; font-weight: 600;
        }
        .mobile-dropdown {
          position: fixed; top: 65px; left: 0; width: 100%; background-color: #1f1815;
          padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; z-index: 999;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Header */}
      <header className="site-header">
        <Link href="/" className="site-logo">
          PRIMEA
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: '#f5f2eb', cursor: 'pointer', padding: '0.5rem' }}
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

      {/* Navigation Overlay */}
      {menuOpen && (
        <nav className="mobile-dropdown">
          <Link href="/" style={{ color: '#f5f2eb', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '2px' }} onClick={() => setMenuOpen(false)}>
            STOREFRONT
          </Link>
          <Link href="/products" style={{ color: '#f5f2eb', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '2px' }} onClick={() => setMenuOpen(false)}>
            PRODUCTS
          </Link>
          <Link href="/cart" style={{ color: '#f5f2eb', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '2px' }} onClick={() => setMenuOpen(false)}>
            CART
          </Link>
          <Link href="/login" style={{ border: '1px solid rgba(245, 242, 235, 0.4)', padding: '0.65rem', borderRadius: '20px', textAlign: 'center', color: '#f5f2eb', textDecoration: 'none', fontSize: '0.85rem' }} onClick={() => setMenuOpen(false)}>
            LOGIN
          </Link>
        </nav>
      )}

      {/* Cart Container */}
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2rem 1rem' }}>
        <h1
          style={{
            fontFamily: 'serif',
            fontSize: '1.875rem',
            marginBottom: '1.5rem',
            color: '#1f1815',
          }}
        >
          Your Shopping Bag
        </h1>

        {cart.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              padding: '2.5rem 1rem',
              borderRadius: '12px',
              border: '1px solid #e2dad0',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                color: '#786e65',
                marginBottom: '1.25rem',
                fontSize: '0.95rem',
              }}
            >
              Your cart is empty.
            </p>
            <Link
              href="/products"
              style={{
                display: 'inline-block',
                background: '#1f1815',
                color: '#ffffff',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
              }}
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem', width: '100%' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2dad0',
                overflow: 'hidden',
              }}
            >
              {cart.map((item) => {
                const stock = item.stock ?? Infinity
                const isMaxStock = item.quantity >= stock

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      borderBottom: '1px solid #f0eae1',
                      boxSizing: 'border-box',
                    }}
                  >
                    {item.image && (
                      <div
                        style={{
                          position: 'relative',
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#eae4d8',
                          flexShrink: 0,
                        }}
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          unoptimized
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '0.95rem',
                          color: '#1f1815',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </strong>
                      <span
                        style={{
                          color: '#b06d50',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        ${item.price.toFixed(2)}
                      </span>
                      {item.stock !== undefined && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: isMaxStock ? '#d9534f' : '#666' }}>
                          {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid #e2dad0',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          padding: '0 0.25rem',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={isMaxStock}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: isMaxStock ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          padding: '0 0.25rem',
                          opacity: isMaxStock ? 0.3 : 1,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2dad0',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    color: '#786e65',
                    display: 'block',
                    fontSize: '0.85rem',
                  }}
                >
                  Subtotal
                </span>
                <strong style={{ fontSize: '1.35rem', color: '#1f1815' }}>
                  ${subtotal.toFixed(2)}
                </strong>
              </div>
              <button
                onClick={handleCheckout}
                disabled={hasStockIssues}
                style={{
                  background: hasStockIssues ? '#888' : '#1f1815',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: hasStockIssues ? 'not-allowed' : 'pointer',
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
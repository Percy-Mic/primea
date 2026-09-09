'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import UserNav from '@/components/UserNav'

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

        const stockMap = new Map((dbProducts || []).map((p: any) => [p.id, p.stock]))

        const updatedWithStock = savedCart.map((item) => ({
          ...item,
          stock: Number(stockMap.get(item.id)) || 0,
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
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        color: '#1f1815',
        position: 'relative',
      }}
    >
      {/* Fixed Custom UserNav Header Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          backgroundColor: '#f5f2eb',
        }}
      >
        <UserNav />
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Cart Container with top padding updated to 100px */}
      <main style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '100px 1rem 2.5rem 1rem' }}>
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
      </main>
    </div>
  )
}

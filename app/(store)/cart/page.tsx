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
    <div style={styles.pageWrapper}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animated-card {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(192, 99, 59, 0.25);
        }
        .action-btn:active {
          transform: translateY(0px);
        }
        .qty-btn:hover {
          background-color: #f2ede4 !important;
          color: #c0633b;
        }
      `}</style>

      {/* Decorative background gradient blobs */}
      <div style={styles.bgBlobTop} />
      <div style={styles.bgBlobBottom} />

      {/* Fixed Custom UserNav Header Container */}
      <div style={styles.navContainer}>
        <UserNav />
      </div>

      {/* Cart Container with top padding */}
      <main style={styles.mainContainer} className="animated-card">
        <div style={styles.headerRow}>
          <div style={styles.iconWrapper}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>Your Shopping Bag</h1>
            <p style={styles.subtitle}>Review your selected items before proceeding to checkout</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>Your cart is empty.</p>
            <Link href="/products" style={styles.exploreButton} className="action-btn">
              Explore Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem', width: '100%' }}>
            <div style={styles.itemsCard}>
              {cart.map((item) => {
                const stock = item.stock ?? Infinity
                const isMaxStock = item.quantity >= stock

                return (
                  <div key={item.id} style={styles.cartItemRow}>
                    {item.image && (
                      <div style={styles.imageWrapper}>
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
                      <strong style={styles.itemTitle}>{item.title}</strong>
                      <span style={styles.itemPrice}>${item.price.toFixed(2)}</span>
                      {item.stock !== undefined && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: isMaxStock ? '#b91c1c' : '#786f66', marginTop: '2px' }}>
                          {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                        </span>
                      )}
                    </div>
                    <div style={styles.quantityControls}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={styles.qtyButton}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '1.2rem', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={isMaxStock}
                        style={{
                          ...styles.qtyButton,
                          cursor: isMaxStock ? 'not-allowed' : 'pointer',
                          opacity: isMaxStock ? 0.3 : 1,
                        }}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={styles.summaryCard}>
              <div>
                <span style={styles.subtotalLabel}>Subtotal</span>
                <strong style={styles.subtotalAmount}>${subtotal.toFixed(2)}</strong>
              </div>
              <button
                onClick={handleCheckout}
                disabled={hasStockIssues}
                className="action-btn"
                style={{
                  ...styles.checkoutButton,
                  backgroundColor: hasStockIssues ? '#8c827a' : '#1f1815',
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

const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg, #fcf9f5 0%, #f4ede2 100%)',
    color: '#1f1815',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  bgBlobTop: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '400px',
    height: '400px',
    background: 'linear-gradient(135deg, rgba(192, 99, 59, 0.12) 0%, rgba(212, 163, 115, 0.05) 100%)',
    borderRadius: '50%',
    filter: 'blur(60px)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgBlobBottom: {
    position: 'absolute',
    bottom: '-10%',
    left: '-10%',
    width: '400px',
    height: '400px',
    background: 'linear-gradient(135deg, rgba(140, 130, 122, 0.1) 0%, rgba(192, 99, 59, 0.08) 100%)',
    borderRadius: '50%',
    filter: 'blur(60px)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  navContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    width: '100%',
    backgroundColor: 'rgba(252, 249, 245, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(232, 226, 217, 0.8)',
  },
  mainContainer: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    padding: '120px 1rem 3rem 1rem',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.75rem',
  },
  iconWrapper: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #c0633b 0%, #e08b65 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(192, 99, 59, 0.25)',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'serif',
    fontSize: '1.85rem',
    fontWeight: 700,
    color: '#1f1815',
    margin: '0 0 0.2rem 0',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#786f66',
    margin: 0,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    padding: '3rem 1rem',
    borderRadius: '16px',
    border: '1px solid rgba(232, 226, 217, 0.8)',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 10px 30px rgba(31, 24, 21, 0.04)',
  },
  emptyText: {
    color: '#786f66',
    marginBottom: '1.25rem',
    fontSize: '0.95rem',
  },
  exploreButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #1f1815 0%, #3d322c 100%)',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 12px rgba(31, 24, 21, 0.15)',
  },
  itemsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(232, 226, 217, 0.8)',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(31, 24, 21, 0.04)',
  },
  cartItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    borderBottom: '1px solid rgba(242, 237, 228, 0.8)',
    boxSizing: 'border-box',
  },
  imageWrapper: {
    position: 'relative',
    width: '65px',
    height: '65px',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: '#faf8f5',
    border: '1px solid #dcd5ca',
    flexShrink: 0,
  },
  itemTitle: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#1f1815',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '0.2rem',
  },
  itemPrice: {
    color: '#c0633b',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#faf8f5',
    border: '1px solid #dcd5ca',
    borderRadius: '8px',
    padding: '0.25rem 0.5rem',
    flexShrink: 0,
  },
  qtyButton: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    padding: '0.1rem 0.4rem',
    color: '#1f1815',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    padding: '1.5rem',
    borderRadius: '16px',
    border: '1px solid rgba(232, 226, 217, 0.8)',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 10px 30px rgba(31, 24, 21, 0.04)',
  },
  subtotalLabel: {
    color: '#786f66',
    display: 'block',
    fontSize: '0.825rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.2rem',
  },
  subtotalAmount: {
    fontSize: '1.4rem',
    color: '#1f1815',
  },
  checkoutButton: {
    background: 'linear-gradient(135deg, #1f1815 0%, #3d322c 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.85rem 1.75rem',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 12px rgba(31, 24, 21, 0.15)',
  },
}

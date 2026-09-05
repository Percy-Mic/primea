'use client'

import { useState } from 'react'

type Product = {
  id: string
  title: string
  price: number
  images?: string[]
}

export default function AddToCartButton({ product }: { product: Product }) {
  const [showToast, setShowToast] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = () => {
    setIsAdding(true)

    // 1. Read existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('elara_cart') || '[]')

    // 2. Add item or increment quantity
    const existingIndex = existingCart.findIndex((item: any) => item.id === product.id)
    if (existingIndex > -1) {
      existingCart[existingIndex].quantity = (existingCart[existingIndex].quantity || 1) + 1
    } else {
      existingCart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.images?.[0] || '',
        quantity: 1,
      })
    }

    // 3. Save to storage & notify other components
    localStorage.setItem('elara_cart', JSON.stringify(existingCart))
    window.dispatchEvent(new Event('cartUpdated'))

    setIsAdding(false)
    setShowToast(true)

    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  return (
    <>
      <style>{`
        .btn-add-cart {
          width: 100%;
          background-color: #1f1815;
          color: #ffffff;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
        }
        .btn-add-cart:hover {
          background-color: #b06d50;
        }
        .btn-add-cart:active {
          transform: scale(0.98);
        }
        .toast-popup {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #1f1815;
          color: #ffffff;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 9999;
          border: 1px solid #b06d50;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .toast-icon {
          background: #b06d50;
          color: #fff;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          font-weight: bold;
        }
      `}</style>

      <button onClick={handleAddToCart} disabled={isAdding} className="btn-add-cart">
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </button>

      {showToast && (
        <div className="toast-popup">
          <div className="toast-icon">✓</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Added to Bag!</div>
            <div style={{ fontSize: '0.8rem', color: '#c5bbb3' }}>{product.title}</div>
          </div>
        </div>
      )}
    </>
  )
}
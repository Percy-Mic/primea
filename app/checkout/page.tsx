'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface CartItem {
  id: string
  title: string
  price: number
  quantity: number
}

function StripeCheckoutForm({ amount, formData, cart }: { amount: number; formData: any; cart: CartItem[] }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    if (loading) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total: amount,
          shipping_address: formData.address,
          full_name: formData.fullName,
          email: formData.email,
          payment_method: 'Card / Digital Payment',
        }),
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to save order in database.')
      }

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          customerName: formData.fullName,
          totalAmount: amount,
          items: cart,
        }),
      }).catch((err) => console.error('Email Dispatch Error:', err))

      localStorage.removeItem('primea_cart')
      localStorage.removeItem('elara_cart')
      window.dispatchEvent(new Event('cartUpdated'))

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
      })

      if (error) {
        setErrorMessage(error.message || 'Payment failed')
        setLoading(false)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
      <PaymentElement />
      {errorMessage && (
        <div style={{ color: '#d9534f', fontSize: '0.85rem', marginTop: '0.5rem', fontFamily: 'sans-serif' }}>
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          ...buttonStyle,
          opacity: (!stripe || loading) ? 0.7 : 1,
          cursor: (!stripe || loading) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientSecret, setClientSecret] = useState('')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('cod')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
  })

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('primea_cart') || localStorage.getItem('elara_cart') || '[]')
    setCart(savedCart)
  }, [])

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleProceed = async () => {
    if (loadingIntent) return

    if (!formData.fullName || !formData.email || !formData.address) {
      alert('Please fill in all shipping fields.')
      return
    }

    if (cart.length === 0) {
      alert('Your cart is empty.')
      return
    }

    setLoadingIntent(true)

    if (paymentMethod === 'cod') {
      try {
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart,
            total: totalAmount,
            shipping_address: formData.address,
            full_name: formData.fullName,
            email: formData.email,
            payment_method: 'Cash on Delivery (COD)',
          }),
        })

        const orderData = await orderRes.json()

        if (!orderRes.ok) {
          throw new Error(orderData.error || 'Failed to submit order.')
        }

        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            customerName: formData.fullName,
            totalAmount: totalAmount,
            items: cart,
          }),
        }).catch((err) => console.error('Email Dispatch Error:', err))

        localStorage.removeItem('primea_cart')
        localStorage.removeItem('elara_cart')
        window.dispatchEvent(new Event('cartUpdated'))
        router.push('/checkout/success')
      } catch (err: any) {
        console.error(err)
        alert(err.message || 'Failed to submit order.')
        setLoadingIntent(false)
      }
    } else {
      if (!stripePromise) {
        alert('Stripe API key is missing. Please configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.')
        setLoadingIntent(false)
        return
      }

      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: totalAmount }),
        })
        const data = await res.json()
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          alert(data.error || 'Failed to initialize payment.')
          setLoadingIntent(false)
        }
      } catch (err) {
        console.error(err)
        alert('Network error initializing payment.')
        setLoadingIntent(false)
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2eb', padding: '3rem 1rem', fontFamily: 'serif', color: '#1f1815' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#ffffff', padding: '2.5rem', borderRadius: '8px', border: '1px solid #e2dad0' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 'normal' }}>PRIMEA Checkout</h1>

        {!clientSecret ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
            <strong>Shipping Information</strong>
            <input
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Street Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={inputStyle}
            />

            <strong style={{ marginTop: '1rem' }}>Payment Option</strong>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={optionLabelStyle}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                />
                Card / Digital Payment
              </label>
              <label style={optionLabelStyle}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                Cash on Delivery (COD)
              </label>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <button
              onClick={handleProceed}
              disabled={loadingIntent || cart.length === 0}
              style={{
                ...buttonStyle,
                opacity: (loadingIntent || cart.length === 0) ? 0.7 : 1,
                cursor: (loadingIntent || cart.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingIntent ? 'Processing...' : paymentMethod === 'cod' ? 'Place COD Order' : 'Proceed to Payment'}
            </button>
          </div>
        ) : (
          stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCheckoutForm amount={totalAmount} formData={formData} cart={cart} />
            </Elements>
          )
        )}
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' as const }
const optionLabelStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }
const buttonStyle = {
  width: '100%',
  background: '#1f1815',
  color: '#fff',
  padding: '0.85rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginTop: '1rem',
}

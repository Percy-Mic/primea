import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.error('Stripe configuration error: STRIPE_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'Payment service is not configured' }, { status: 500 })
  }

  try {
    const { amount } = await req.json()
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 })
    }

    const stripe = new Stripe(stripeKey, { typescript: true })
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown payment error'
    console.error('Stripe API Error:', message)
    return NextResponse.json({ error: 'Unable to create payment intent' }, { status: 500 })
  }
}

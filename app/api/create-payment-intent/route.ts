import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Direct secret key fallback to resolve 401 authentication errors
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51Tn8Wz4HIQKZQjRvfMxvR8WgiKco2wkGgtCpNGJ6lCjT3LpW8OQmhu5lMxu67CnbINBoLl6lmZgeGfty5Aua6H0y00m3on51sP'

const stripe = new Stripe(stripeKey, {
  typescript: true,
})

export async function POST(req: Request) {
  try {
    const { amount } = await req.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: any) {
    console.error('Stripe API Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
})

// Initialize a Supabase admin client to bypass RLS securely on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { orderId, paymentIntentId } = await req.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 })
    }

    // 1. Issue refund via Stripe API
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    })

    // 2. Update order status in Supabase to 'refunded'
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId)

    if (dbError) {
      throw new Error(`Failed to update order status: ${dbError.message}`)
    }

    return NextResponse.json({ success: true, refundId: refund.id })
  } catch (error: any) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

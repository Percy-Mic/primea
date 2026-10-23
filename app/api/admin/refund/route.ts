import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
      console.error('Admin refund route is missing STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Refund service is not configured' }, { status: 503 })
    }

    const { orderId, paymentIntentId } = await req.json()

    if (!orderId || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing order ID or payment intent ID' }, { status: 400 })
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2025-02-28.acacia' as any,
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Issue the refund via Stripe.
    await stripe.refunds.create({ payment_intent: paymentIntentId })

    // Update order status in Supabase.
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId)

    if (dbError) {
      throw new Error(`Failed to update order status: ${dbError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Refund error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

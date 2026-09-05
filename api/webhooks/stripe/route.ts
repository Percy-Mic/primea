import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const headerList = await headers()
  const signature = headerList.get('Stripe-Signature') as string

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata.userId
    const items = JSON.parse(session.metadata.itemsJson)

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: session.amount_total / 100,
        status: 'processing',
        stripe_session_id: session.id,
        shipping_address: session.shipping_details || {},
      })
      .select('id')
      .single()

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('price, stock')
        .eq('id', item.productId)
        .single()

      if (product) {
        await supabaseAdmin.from('order_items').insert({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: product.price,
        })

        await supabaseAdmin
          .from('products')
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq('id', item.productId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
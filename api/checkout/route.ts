import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // Adjust path to your Supabase client

export async function POST(request: Request) {
  try {
    const { cartItems } = await request.json()
    const supabase = await createClient()

    // 1. Fetch current stock from Supabase for all requested items
    const productIds = cartItems.map((item: any) => item.id)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', productIds)

    if (error || !products) {
      return NextResponse.json({ error: 'Failed to fetch inventory.' }, { status: 400 })
    }

    // 2. Validate requested quantities against database stock
    for (const cartItem of cartItems) {
      const dbProduct = products.find((p: any) => p.id === cartItem.id)
      
      if (!dbProduct) {
        return NextResponse.json({ error: `Product not found.` }, { status: 400 })
      }

      if (cartItem.quantity > dbProduct.stock) {
        return NextResponse.json(
          { error: `Cannot buy ${cartItem.quantity} units of ${dbProduct.name}. Only ${dbProduct.stock} in stock.` },
          { status: 400 }
        )
      }
    }

    // 3. Proceed with Stripe or Order Creation logic here

    return NextResponse.json({ success: true, url: '/checkout/success' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Checkout failed.' }, { status: 500 })
  }
}
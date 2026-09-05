import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface ItemPayload {
  productId?: string
  id?: string
  product_id?: string
  quantity: number
}

interface ProductDb {
  id: string
  title: string
  stock: number
  price: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawItems: ItemPayload[] = body.items || []

    // Normalize items so it handles productId, id, or product_id from any frontend cart format
    const items = rawItems.map(item => ({
      productId: item.productId || item.id || item.product_id,
      quantity: item.quantity
    }))

    if (items.some(i => !i.productId)) {
      return NextResponse.json({ error: 'Invalid or missing product ID in cart items.' }, { status: 400 })
    }

    const cookieStore = await cookies()

    // Client for checking user session & fetching products
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Admin client using service role key to bypass RLS for secure order/stock updates
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch inventory & prices
    const productIds = items.map((i) => i.productId as string)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, stock, price')
      .in('id', productIds)

    if (error || !products) {
      console.error('Inventory fetch error:', error?.message)
      return NextResponse.json({ error: 'Failed to fetch inventory.' }, { status: 400 })
    }

    let totalAmount = 0

    // 3. Validate stock & compute total
    for (const item of items) {
      const dbProduct = products.find((p: ProductDb) => p.id === item.productId)

      if (!dbProduct) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 400 })
      }

      if (item.quantity > dbProduct.stock) {
        return NextResponse.json(
          { error: `Only ${dbProduct.stock} units left for ${dbProduct.title}.` },
          { status: 400 }
        )
      }

      totalAmount += dbProduct.price * item.quantity
    }

    // 4. Create Order linked to authenticated user ID (using admin)
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user?.id || null,
        total_amount: totalAmount,
        status: 'Completed',
      })
      .select('id')
      .single()

    if (orderError || !newOrder) {
      console.error('Order creation error:', orderError?.message)
      return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 })
    }

    // 5. Create Order Items (using admin)
    const orderItemsPayload = items.map((item) => ({
      order_id: newOrder.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: products.find((p) => p.id === item.productId)?.price || 0,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsPayload)

    if (itemsError) {
      console.error('Order items insertion error:', itemsError.message)
      return NextResponse.json({ error: 'Failed to record order items.' }, { status: 500 })
    }

    // 6. Decrement Product Stocks (using admin to bypass RLS) with debugging logs
    for (const item of items) {
      const dbProduct = products.find((p) => p.id === item.productId)
      if (dbProduct) {
        const newStock = Math.max(0, dbProduct.stock - item.quantity)
        console.log(`[Stock Update] Product: "${dbProduct.title}" | Old Stock: ${dbProduct.stock} | Deducting: ${item.quantity} | New Stock: ${newStock}`)

        const { error: stockError } = await supabaseAdmin
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.productId)

        if (stockError) {
          console.error(`❌ Failed to update stock for product ${item.productId}:`, stockError.message)
        } else {
          console.log(`✅ Successfully updated stock for "${dbProduct.title}" in Supabase!`)
        }
      }
    }

    return NextResponse.json({ success: true, url: '/checkout/success' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed.'
    console.error('Unexpected checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
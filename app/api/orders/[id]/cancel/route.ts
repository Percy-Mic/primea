import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const supabase = await createClient()

    // Update the order status to Cancelled in Supabase
    const { data, error } = await supabase
      .from('orders') // Make sure this matches your table name (orders vs order)
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to cancel order in database:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
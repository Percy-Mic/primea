// app/api/orders/[id]/track/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient' // Ensure your supabase client path is correct

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Query your actual database table for real tracking info
    const { data, error } = await supabase
      .from('orders')
      .select('status, current_lat, current_lng, tracking_logs')
      .eq('id', orderId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Order tracking details not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      status: data.status || 'Processing',
      currentLocation: { 
        lat: Number(data.current_lat) || 0, 
        lng: Number(data.current_lng) || 0 
      },
      logs: data.tracking_logs || []
    })

  } catch (err: any) {
    console.error('Tracking API Exception:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}

// app/api/orders/[id]/track/route.ts
import { NextResponse } from 'next/server'
// import { supabase } from '@/lib/supabaseClient' // Uncomment when connected to your database

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // If using Supabase, fetch real live tracking rows from your orders table:
    /*
    const { data, error } = await supabase
      .from('orders')
      .select('status, current_lat, current_lng, tracking_logs')
      .eq('id', orderId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: data.status,
      currentLocation: { 
        lat: Number(data.current_lat) || 14.5995, 
        lng: Number(data.current_lng) || 120.9842 
      },
      logs: data.tracking_logs || []
    })
    */

    // Fallback response simulating real-time rider GPS movement and activity logs
    return NextResponse.json({
      success: true,
      status: 'Out for Delivery',
      currentLocation: { 
        lat: 14.5995 + (Math.random() - 0.5) * 0.01, 
        lng: 120.9842 + (Math.random() - 0.5) * 0.01 
      },
      logs: [
        { 
          title: 'Courier rider picked up order from fulfillment hub', 
          timestamp: 'Just now', 
          type: 'transit' 
        },
        { 
          title: 'Package arrived at local sorting sorting facility', 
          timestamp: '45 mins ago', 
          type: 'hub' 
        },
        { 
          title: 'Order successfully verified and placed', 
          timestamp: 'Yesterday', 
          type: 'created' 
        }
      ]
    })

  } catch (err) {
    console.error('Tracking API Error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error while fetching live tracking' }, 
      { status: 500 }
    )
  }
}

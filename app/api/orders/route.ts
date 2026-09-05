import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all orders safely
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Attach items data format expected by frontend
    const ordersWithItems = (data || []).map((order) => {
      let parsedItems = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch (e) {
        parsedItems = [];
      }
      return { ...order, order_items: parsedItems };
    });

    return NextResponse.json({ success: true, orders: ordersWithItems });
  } catch (error: any) {
    console.error('API Orders GET Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Update order status and decrement stock on fulfillment
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    const orderId = body.orderId || body.id || body.order_id;
    let status = body.status;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'Missing orderId or status' }, { status: 400 });
    }

    // Capitalize status to match your database enum ('Completed', 'Shipped', 'Pending')
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // 1. Fetch current order status and its items JSONB column
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, items')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update order status in the database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: formattedStatus })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 3. If transitioning to a completed/shipped state for the first time, decrement stock
    const fulfillmentStatuses = ['shipped', 'completed', 'complete', 'delivered'];
    const oldStatus = (currentOrder.status || '').toLowerCase();
    const newStatus = formattedStatus.toLowerCase();

    if (
      fulfillmentStatuses.includes(newStatus) && 
      !fulfillmentStatuses.includes(oldStatus)
    ) {
      let orderItems = [];
      try {
        orderItems = typeof currentOrder.items === 'string' 
          ? JSON.parse(currentOrder.items) 
          : (currentOrder.items || []);
      } catch (e) {
        orderItems = [];
      }

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          // Adjust property names based on how your JSONB stores product reference & quantity (e.g. id/product_id and quantity)
          const productId = item.product_id || item.id;
          const quantity = item.quantity || item.qty || 1;

          if (productId) {
            const { error: stockError } = await supabase.rpc('decrement_product_stock', {
              product_id: productId,
              amount: quantity,
            });

            if (stockError) {
              console.error(`Failed to update stock for product ${productId}:`, stockError);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Order status updated and stock adjusted successfully.' });
  } catch (error: any) {
    console.error('API Orders PATCH Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
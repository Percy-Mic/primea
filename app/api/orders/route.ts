import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

const supabaseAdmin = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch orders (All orders for admin, user-specific orders for customers)
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || profile?.role === 'admin';

    let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });

    // If NOT an admin, restrict results strictly to their own user ID
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

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

// POST: Save a new order when checkout completes successfully
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { items, total, shipping_address, full_name, email, payment_method } = body;

    const customerEmail = email || (user ? user.email : '');
    const orderTotal = total || 0;

    // DEDUPLICATION CHECK
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recentOrders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('email', customerEmail)
      .eq('total_amount', orderTotal)
      .gte('created_at', tenSecondsAgo)
      .order('created_at', { ascending: true });

    if (recentOrders && recentOrders.length > 0) {
      return NextResponse.json({ success: true, order: recentOrders[0], message: 'Order already processed' });
    }

    const newOrder = {
      user_id: user ? user.id : null,
      items: typeof items === 'string' ? items : JSON.stringify(items || []),
      total_amount: orderTotal,
      status: 'Pending', // Using standard 'status' column
      address: shipping_address || '',
      customer_name: full_name || '',
      email: customerEmail,
      payment_method: payment_method || 'Card / Digital Payment',
    };

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, order: data });
  } catch (error: any) {
    console.error('API Orders POST Error:', error.message);
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

    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const lowercaseStatus = status.toLowerCase();

    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, items')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // Update using standard 'status' column
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: formattedStatus
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    const fulfillmentStatuses = ['shipped', 'completed', 'complete', 'delivered'];
    const oldStatus = (currentOrder.status || '').toLowerCase();

    if (
      fulfillmentStatuses.includes(lowercaseStatus) && 
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
          const productId = item.product_id || item.id;
          const quantity = item.quantity || item.qty || 1;

          if (productId) {
            await supabaseAdmin.rpc('decrement_product_stock', {
              product_id: productId,
              amount: quantity,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Order status updated successfully.' });
  } catch (error: any) {
    console.error('API Orders PATCH Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

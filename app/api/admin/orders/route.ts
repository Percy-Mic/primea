import { NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';

// Service role client to bypass RLS for admin views
const supabaseAdmin = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch all orders using a case-insensitive filter to catch 'cancelled', 'Cancelled', etc.
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .not('status', 'ilike', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Failed to fetch admin orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' }, 
      { status: 500 }
    );
  }
}

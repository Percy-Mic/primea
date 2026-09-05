export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch orders from Supabase, filtering out cancelled ones
    const { data: orders, error } = await supabase
      .from('order')
      .select('*, user(*), items(*)')
      .neq('status', 'Cancelled')
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Failed to fetch admin orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

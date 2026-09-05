import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // Adjust path if needed

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(products || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
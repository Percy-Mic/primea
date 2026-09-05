import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const selectedMonth = searchParams.get('month') !== null 
      ? Number(searchParams.get('month')) 
      : now.getMonth()
    const selectedYear = searchParams.get('year') !== null 
      ? Number(searchParams.get('year')) 
      : now.getFullYear()

    // Determine previous month and its corresponding year
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
    const prevMonthYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear

    // 1. Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')

    if (ordersError) throw ordersError

    // 2. Fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')

    if (productsError) throw productsError

    const allOrders = orders || []
    const allProducts = products || []

    // Exclude cancelled orders from revenue and general metrics
    const validOrders = allOrders.filter(
      (o) => o.status?.toLowerCase() !== 'cancelled'
    )

    // Lifetime Revenue (from all non-cancelled orders)
    const revenue = validOrders.reduce((sum, o) => {
      const val = o.total ?? o.total_amount ?? 0
      return sum + Number(val)
    }, 0)

    // Selected Month Orders & Revenue
    const monthlyOrders = validOrders.filter((o) => {
      if (!o.created_at) return false
      const d = new Date(o.created_at)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })

    const monthlyRevenue = monthlyOrders.reduce((sum, o) => {
      const val = o.total ?? o.total_amount ?? 0
      return sum + Number(val)
    }, 0)

    // Previous Month Orders & Revenue
    const prevMonthlyOrders = validOrders.filter((o) => {
      if (!o.created_at) return false
      const d = new Date(o.created_at)
      return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear
    })

    const prevMonthlyRevenue = prevMonthlyOrders.reduce((sum, o) => {
      const val = o.total ?? o.total_amount ?? 0
      return sum + Number(val)
    }, 0)

    // Calculate Percentage Changes
    const revenueGrowth = prevMonthlyRevenue > 0
      ? ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0

    const ordersGrowth = prevMonthlyOrders.length > 0
      ? ((monthlyOrders.length - prevMonthlyOrders.length) / prevMonthlyOrders.length) * 100
      : monthlyOrders.length > 0 ? 100 : 0

    // Selected Year Summary
    const yearlyOrders = validOrders.filter((o) => {
      if (!o.created_at) return false
      return new Date(o.created_at).getFullYear() === selectedYear
    })

    const yearlyRevenue = yearlyOrders.reduce((sum, o) => {
      const val = o.total ?? o.total_amount ?? 0
      return sum + Number(val)
    }, 0)

    // Analytics
    const averageOrderValue = validOrders.length > 0 ? revenue / validOrders.length : 0

    // Recent Orders
    const recentOrders = allOrders
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5)
      .map((o) => ({
        id: String(o.id).slice(0, 8),
        customer: o.customer_name || o.email || o.shipping?.fullName || 'Guest',
        total: Number(o.total ?? o.total_amount ?? 0),
        status: o.status || 'Pending',
        createdAt: o.created_at,
      }))

    // Inventory metrics
    const activeProducts = allProducts.length
    const totalUnits = allProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0)
    const totalInventoryValue = allProducts.reduce(
      (sum, p) => sum + Number(p.stock || 0) * Number(p.price || 0),
      0
    )

    const lowStockItems = allProducts
      .filter((p) => Number(p.stock || 0) <= 5)
      .map((p) => ({
        id: p.id,
        title: p.title || p.name || 'Product',
        stock: Number(p.stock || 0),
      }))

    return NextResponse.json({
      stats: {
        revenue,
        totalOrders: validOrders.length,
        activeProducts,
        totalUnits,
        totalInventoryValue,
        lowStockItems,
      },
      summaries: {
        monthly: {
          revenue: monthlyRevenue,
          ordersCount: monthlyOrders.length,
          revenueGrowth,
          ordersGrowth,
          monthIndex: selectedMonth,
          year: selectedYear,
        },
        yearly: {
          revenue: yearlyRevenue,
          ordersCount: yearlyOrders.length,
          year: selectedYear,
        },
      },
      analytics: {
        averageOrderValue,
        pendingOrdersCount: allOrders.filter((o) => o.status?.toLowerCase() === 'pending').length,
      },
      recentOrders,
    })
  } catch (err: any) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
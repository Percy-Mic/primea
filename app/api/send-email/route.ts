import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { email, customerName, totalAmount, items } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY missing. Mock email triggered for:', email)
      return NextResponse.json({ success: true, mock: true })
    }

    const { data, error } = await resend.emails.send({
      from: 'PRIMEA Store <onboarding@resend.dev>',
      to: [email],
      subject: 'Order Confirmation - PRIMEA Store',
      html: `
        <h2>Thank you for your order, ${customerName}!</h2>
        <p>We received your order totaling <strong>$${Number(totalAmount).toFixed(2)}</strong>.</p>
        <h3>Order Items:</h3>
        <ul>
          ${items.map((item: any) => `<li>${item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
        </ul>
      `,
    })

    if (error) {
      console.error('Resend Delivery Error:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Send Email Route Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
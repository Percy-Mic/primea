import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const productId = formData.get('productId') as string
    const orderId = formData.get('orderId') as string
    const rating = formData.get('rating') as string
    const comment = formData.get('comment') as string
    
    // Extract reviewer name (falling back to "Anonymous" if empty)
    const userName = (formData.get('user_name') || formData.get('userName') || 'Anonymous') as string

    // Extract photo or media upload
    const media = (formData.get('media') || formData.get('photo')) as File | null
    const mediaType = formData.get('mediaType') as string

    let mediaUrl: string | null = null

    if (media && media instanceof File && media.size > 0) {
      const isVideo = mediaType === 'video' || media.type.startsWith('video/')
      const defaultExt = isVideo ? 'mp4' : 'png'
      const fileExt = media.name.split('.').pop() || defaultExt
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const arrayBuffer = await media.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)

      const { error: storageError } = await supabase.storage
        .from('review-photo')
        .upload(filePath, fileData, {
          contentType: media.type || (isVideo ? 'video/mp4' : 'image/png'),
          upsert: true,
        })

      if (storageError) {
        console.error('Supabase Storage Error:', storageError)
        return NextResponse.json({ error: storageError.message }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage
        .from('review-photo')
        .getPublicUrl(filePath)

      mediaUrl = publicUrlData.publicUrl
    }

    // Insert record with mandatory user_name
    const { data, error: dbError } = await supabase
      .from('reviews')
      .insert([
        {
          product_id: productId,
          order_id: orderId,
          user_name: userName,
          rating: Number(rating) || 5,
          comment: comment || '',
          image_url: mediaUrl,
        },
      ])
      .select()

    if (dbError) {
      console.error('Supabase DB Error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, review: data }, { status: 200 })
  } catch (err: any) {
    console.error('Review Handler Crash:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
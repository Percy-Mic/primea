import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AddToCartButton from '@/components/AddToCartButton'
import UserNav from '@/components/UserNav'

interface ProductPageProps {
  params: Promise<{ id: string }>
}

async function checkUserEligibility(supabase: any, userId: string, productId: string) {
  const validStatuses = ['completed', 'delivered', 'Completed', 'Delivered']

  const { data: orderItem } = await supabase
    .from('order_items')
    .select('id, orders!inner(user_id, status)')
    .eq('product_id', productId)
    .eq('orders.user_id', userId)
    .in('orders.status', validStatuses)
    .limit(1)
    .maybeSingle()

  if (orderItem) return true

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .in('status', validStatuses)
    .limit(1)
    .maybeSingle()

  return !!order
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const primaryImage = product.image_url || product.images?.[0] || null

  const { data: { user } } = await supabase.auth.getUser()
  const hasPurchased = user ? await checkUserEligibility(supabase, user.id, id) : false

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

  const reviewList = reviews || []
  const reviewCount = reviewList.length

  const positiveReviews = reviewList.filter((r) => r.rating >= 4).length
  const satisfactionRate = reviewCount > 0 ? Math.round((positiveReviews / reviewCount) * 100) : 100

  const avgRating = reviewCount > 0
    ? (reviewList.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewCount).toFixed(1)
    : '5.0'

  const starCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviewList.filter((r) => r.rating === stars).length
    return {
      stars,
      count,
      percentage: reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0,
    }
  })

  const { data: relatedProducts } = await supabase
    .from('products')
    .select('*')
    .neq('id', id)
    .limit(4)

  async function submitReview(formData: FormData) {
    'use server'
    const client = await createClient()
    const { data: { user: currentUser } } = await client.auth.getUser()

    if (!currentUser) redirect('/login')

    const isEligible = await checkUserEligibility(client, currentUser.id, id)
    if (!isEligible) {
      throw new Error('You can only review products from completed orders.')
    }

    const name = formData.get('name') as string
    const rating = Number(formData.get('rating')) || 5
    const comment = formData.get('comment') as string
    const mediaFile = formData.get('media') as File

    let uploadedMediaUrl = null

    if (mediaFile && mediaFile.size > 0) {
      const cleanFileName = mediaFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${Date.now()}-${cleanFileName}`

      const { data: storageData } = await client.storage
        .from('review-images')
        .upload(filePath, mediaFile, { 
          cacheControl: '3600', 
          upsert: false,
          contentType: mediaFile.type 
        })

      if (storageData) {
        const { data: publicUrlData } = client.storage
          .from('review-images')
          .getPublicUrl(storageData.path)

        uploadedMediaUrl = publicUrlData.publicUrl
      }
    }

    await client.from('reviews').insert({
      product_id: id,
      user_id: currentUser.id,
      user_name: name || currentUser.email || 'Verified Buyer',
      rating,
      comment,
      image_url: uploadedMediaUrl,
    })

    redirect(`/products/${id}`)
  }

  return (
    <div className="product-details-page">
      {/* Sticky wrapper keeping UserNav locked at the top */}
      <div className="sticky-nav-wrapper">
        <UserNav />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .product-details-page {
          background: linear-gradient(135deg, #faf8f5 0%, #f3eee3 100%);
          min-height: 100vh;
          font-family: serif;
          color: #1f1815;
          padding-bottom: 6rem;
          position: relative;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .sticky-nav-wrapper {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          background: rgba(250, 248, 245, 0.95);
          backdrop-filter: blur(8px);
        }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 0 1.5rem;
        }
        .product-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3.5rem;
          margin-bottom: 5rem;
        }
        @media (min-width: 768px) {
          .product-grid { grid-template-columns: 1fr 1fr; }
        }
        .image-container {
          position: relative;
          aspect-ratio: 1 / 1;
          width: 100%;
          background: linear-gradient(145deg, #f5f2ed, #eae3d5);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(232, 226, 217, 0.8);
          box-shadow: 0 20px 40px -15px rgba(60, 40, 25, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }
        .image-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px -20px rgba(160, 59, 30, 0.15);
        }
        .product-title {
          font-family: serif;
          font-size: 2.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 400;
          letter-spacing: -0.02em;
          background: linear-gradient(120deg, #1f1815, #4d3a31);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .product-price {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a03b1e, #d9532b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1.5rem;
        }
        .section-heading {
          font-family: serif;
          font-size: 2rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid;
          border-image: linear-gradient(to right, #a03b1e, #e2dad0, transparent) 1;
          padding-bottom: 0.75rem;
          font-weight: 400;
        }
        .summary-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232, 226, 217, 0.9);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 12px 30px -10px rgba(31, 24, 21, 0.05);
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .summary-card { grid-template-columns: 1fr 2fr; }
        }
        .overall-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #faf7f2, #f2ece1);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #e8e2d9;
        }
        .satisfaction-tag {
          background: linear-gradient(135deg, #e6f4ea, #d1e7dd);
          color: #137333;
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          margin-top: 0.75rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .progress-track {
          flex-grow: 1;
          height: 10px;
          background-color: #f0eae1;
          border-radius: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a03b1e, #d9532b);
          border-radius: 6px;
        }
        .reviews-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          margin-bottom: 4rem;
        }
        @media (min-width: 768px) {
          .reviews-layout { grid-template-columns: 1fr 2fr; }
        }
        .review-form {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid #e8e2d9;
          box-shadow: 0 15px 35px -10px rgba(31, 24, 21, 0.06);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e2dad0;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
          background: #faf8f5;
        }
        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #a03b1e;
          background: #ffffff;
        }
        .btn-submit {
          background: linear-gradient(135deg, #1f1815, #3b302a);
          color: #ffffff;
          border: none;
          padding: 0.85rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }
        .btn-submit:hover {
          background: linear-gradient(135deg, #a03b1e, #d9532b);
          transform: translateY(-2px);
        }
        .reviews-feed-container {
          max-height: 520px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .reviews-feed-container::-webkit-scrollbar {
          width: 6px;
        }
        .reviews-feed-container::-webkit-scrollbar-thumb {
          background-color: #c4b6a5;
          border-radius: 4px;
        }
        .review-card {
          background: rgba(255, 255, 255, 0.9);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e8e2d9;
          margin-bottom: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 6px 20px rgba(31, 24, 21, 0.03);
        }
        .review-proof-media {
          position: relative;
          width: 150px;
          height: 110px;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 1rem;
          border: 1px solid #e2dad0;
          background: #000;
        }
        .verified-badge {
          background: linear-gradient(135deg, #f0f7f4, #e2f0ec);
          color: #2e7d32;
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-left: 0.5rem;
        }
        .purchase-warning {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e8e2d9;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          color: #786e65;
          font-size: 0.95rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 2rem;
        }
        .related-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e8e2d9;
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.4s ease;
        }
        .related-card:hover {
          transform: translateY(-6px);
          border-color: rgba(160, 59, 30, 0.4);
        }
        .related-img {
          position: relative;
          height: 220px;
          background: linear-gradient(145deg, #f5f2ed, #eae3d5);
          overflow: hidden;
        }
        .svg-icon {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          fill: currentColor;
        }
      `}</style>

      <div className="container">
        {/* Product Display */}
        <div className="product-grid">
          <div className="image-container">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={product.title}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
                priority
              />
            ) : (
              <span style={{ color: '#786e65', fontFamily: 'system-ui' }}>No Image Available</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="product-title">{product.title}</h1>
            <div style={{ color: '#a03b1e', marginBottom: '1rem', fontFamily: 'system-ui', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <span style={{ color: '#1f1815', marginLeft: '0.2rem' }}>{avgRating}</span> 
              <span style={{ color: '#786e65', fontWeight: 400 }}>({reviewCount} reviews)</span>
            </div>
            <div className="product-price">${Number(product.price).toFixed(2)}</div>
            <p style={{ color: '#524842', lineHeight: 1.7, marginBottom: '2rem', fontFamily: 'system-ui', fontSize: '1rem' }}>
              {product.description || 'Elevate your style with this high-quality artisanal product.'}
            </p>

            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                price: Number(product.price),
                images: primaryImage ? [primaryImage] : [],
              }}
            />
          </div>
        </div>

        {/* Customer Reviews */}
        <section>
          <h2 className="section-heading">Customer Feedback & Rating Summary</h2>

          <div className="summary-card">
            <div className="overall-score">
              <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1f1815, #a03b1e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{avgRating}</div>
              <div style={{ color: '#a03b1e', fontSize: '1rem', marginTop: '0.5rem', display: 'flex', gap: '2px' }}>
                <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#786e65', marginTop: '0.35rem', fontFamily: 'system-ui' }}>
                Based on {reviewCount} reviews
              </div>
              <span className="satisfaction-tag">
                {satisfactionRate}% Highly Satisfied
              </span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontFamily: 'system-ui', fontWeight: 600 }}>Rating Breakdown</h4>
              {starCounts.map((s) => (
                <div key={s.stars} className="progress-bar-container">
                  <span style={{ width: '55px', color: '#786e65', fontWeight: 500 }}>{s.stars} stars</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', color: '#786e65', fontWeight: 500 }}>{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-layout">
            <div>
              {hasPurchased ? (
                <form action={submitReview} encType="multipart/form-data" className="review-form">
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'serif', fontWeight: 400, color: '#1f1815' }}>Write a Review</h3>
                  <input type="text" name="name" placeholder="Your Name" required className="form-input" />

                  <select name="rating" className="form-select" defaultValue="5">
                    <option value="5">5 Stars - Very Satisfied</option>
                    <option value="4">4 Stars - Satisfied</option>
                    <option value="3">3 Stars - Average</option>
                    <option value="2">2 Stars - Unsatisfied</option>
                    <option value="1">1 Star - Very Unsatisfied</option>
                  </select>

                  <textarea
                    name="comment"
                    placeholder="Share your experience with this item..."
                    rows={4}
                    required
                    className="form-textarea"
                  />

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: '#524842' }}>
                      Attach Photo or Video Proof (Optional)
                    </label>
                    <input 
                      type="file" 
                      name="media" 
                      accept="image/*,video/*" 
                      className="form-input" 
                    />
                  </div>

                  <button type="submit" className="btn-submit">
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="purchase-warning">
                  <div style={{ marginBottom: '0.75rem', color: '#a03b1e', display: 'inline-block' }}>
                    <svg style={{ width: '32px', height: '32px', fill: 'currentColor' }} viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </div>
                  <strong style={{ display: 'block', color: '#1f1815', marginBottom: '0.35rem', fontSize: '1.05rem' }}>
                    Verified Buyers Only
                  </strong>
                  You must complete a purchase of this product before writing a review.
                </div>
              )}
            </div>

            <div className="reviews-feed-container">
              {reviewList.length > 0 ? (
                reviewList.map((rev) => {
                  const isVideo = rev.image_url && /\.(mp4|webm|ogg|mov)$/i.test(rev.image_url)

                  return (
                    <div key={rev.id} className="review-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#1f1815' }}>{rev.user_name}</strong>
                          <span className="verified-badge">
                            <svg style={{ width: '12px', height: '12px', fill: 'currentColor' }} viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            Verified Owner
                          </span>
                        </div>
                        <span style={{ color: '#a03b1e', display: 'flex', gap: '1px' }}>
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <svg key={i} className="svg-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          ))}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#524842', fontSize: '0.95rem', lineHeight: 1.6 }}>{rev.comment}</p>

                      {rev.image_url && (
                        <div className="review-proof-media">
                          {isVideo ? (
                            <video
                              src={rev.image_url}
                              controls
                              preload="metadata"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Image
                              src={rev.image_url}
                              alt="Customer proof photo"
                              fill
                              unoptimized
                              style={{ objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '2.5rem', borderRadius: '12px', textAlign: 'center', color: '#786e65', border: '1px solid #e8e2d9', fontFamily: 'system-ui' }}>
                  No customer reviews yet. Be the first to share your experience!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Product Suggestions */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section>
            <h2 className="section-heading">You May Also Like</h2>
            <div className="related-grid">
              {relatedProducts.map((rel) => {
                const relImg = rel.image_url || rel.images?.[0]
                return (
                  <Link key={rel.id} href={`/products/${rel.id}`} className="related-card">
                    <div className="related-img">
                      {relImg ? (
                        <Image
                          src={relImg}
                          alt={rel.title}
                          fill
                          unoptimized
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#786e65', fontFamily: 'system-ui' }}>
                          No Image
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.25rem', fontFamily: 'system-ui' }}>
                      <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.35rem', color: '#1f1815' }}>
                        {rel.title}
                      </strong>
                      <span style={{ color: '#a03b1e', fontWeight: 700, fontSize: '1rem' }}>
                        ${Number(rel.price).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

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
      {/* Fixed Custom UserNav Header Container (Untouched) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          backgroundColor: '#faf8f5',
        }}
      >
        <UserNav />
      </div>

      <style>{`
        .product-details-page {
          background-color: #faf8f5;
          background-image: radial-gradient(#e8dfd3 0.75px, transparent 0.75px);
          background-size: 24px 24px;
          min-height: 100vh;
          font-family: serif;
          color: #1f1815;
          padding-top: 120px;
          padding-bottom: 6rem;
          position: relative;
        }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
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
          background: linear-gradient(135deg, #f5f2ed 0%, #ece5dc 100%);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e8e2d9;
          box-shadow: 0 15px 35px -10px rgba(61, 43, 31, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }
        .image-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -10px rgba(61, 43, 31, 0.15);
        }
        .image-container img {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .image-container:hover img {
          transform: scale(1.03);
        }
        .product-title {
          font-family: serif;
          font-size: 2.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 400;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, #1f1815 0%, #4a3830 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .product-price {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a03b1e 0%, #73220b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1.5rem;
        }
        .section-heading {
          font-family: serif;
          font-size: 2rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid;
          border-image: linear-gradient(to right, #a03b1e, #d4af37, transparent) 1;
          padding-bottom: 0.75rem;
          font-weight: 400;
        }
        .summary-card {
          background: linear-gradient(145deg, #ffffff 0%, #fbf9f6 100%);
          border: 1px solid #e8e2d9;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 10px 30px -10px rgba(40, 28, 20, 0.05);
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
          background: linear-gradient(135deg, #faf7f2 0%, #f2eae1 100%);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #eadece;
        }
        .satisfaction-tag {
          background: linear-gradient(135deg, #e6f4ea 0%, #cef0d9 100%);
          color: #137333;
          padding: 0.35rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          margin-top: 0.75rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 2px 6px rgba(19, 115, 51, 0.1);
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
          border-radius: 5px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a03b1e 0%, #c85a38 100%);
          border-radius: 5px;
          transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
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
          background: #ffffff;
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid #e8e2d9;
          box-shadow: 0 10px 30px -10px rgba(40, 28, 20, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .review-form:focus-within {
          box-shadow: 0 15px 35px -10px rgba(160, 59, 30, 0.12);
          border-color: #d4af37;
        }
        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e2dad0;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          background-color: #fcfbfa;
          transition: all 0.2s ease;
        }
        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #a03b1e;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(160, 59, 30, 0.1);
        }
        .btn-submit {
          background: linear-gradient(135deg, #1f1815 0%, #3b2c24 100%);
          color: #ffffff;
          border: none;
          padding: 0.85rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 0.8rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(31, 24, 21, 0.2);
        }
        .btn-submit:hover {
          background: linear-gradient(135deg, #3b2c24 100%, #594438 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(31, 24, 21, 0.3);
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
          background-color: #d1c7bc;
          border-radius: 4px;
        }
        .review-card {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e8e2d9;
          margin-bottom: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .review-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(40, 28, 20, 0.06);
        }
        .review-proof-media {
          position: relative;
          width: 150px;
          height: 110px;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 1rem;
          border: 1px solid #e2dad0;
          background: #000;
          transition: transform 0.3s ease;
        }
        .review-proof-media:hover {
          transform: scale(1.02);
        }
        .verified-badge {
          background: linear-gradient(135deg, #f0f7f4 0%, #e1f0e5 100%);
          color: #2e7d32;
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-left: 0.5rem;
          border: 1px solid #c8e6c9;
        }
        .purchase-warning {
          background: linear-gradient(135deg, #ffffff 0%, #fcfbfa 100%);
          border: 1px solid #e8e2d9;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          color: #786e65;
          font-size: 0.9rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 30px -10px rgba(40, 28, 20, 0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .warning-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f5f2ed;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a03b1e;
          border: 1px solid #e8e2d9;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
        }
        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 2rem;
        }
        .related-card {
          background: #ffffff;
          border: 1px solid #e8e2d9;
          border-radius: 14px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .related-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 32px -10px rgba(61, 43, 31, 0.12);
          border-color: #d4af37;
        }
        .related-img {
          position: relative;
          height: 220px;
          background: #f5f2ed;
          overflow: hidden;
        }
        .related-img img {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .related-card:hover .related-img img {
          transform: scale(1.06);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontFamily: 'system-ui', fontSize: '0.95rem' }}>
              <span style={{ color: '#a03b1e', display: 'flex', gap: '2px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </span>
              <strong style={{ color: '#1f1815' }}>{avgRating}</strong>
              <span style={{ color: '#786e65' }}>({reviewCount} reviews)</span>
            </div>
            <div className="product-price">${Number(product.price).toFixed(2)}</div>
            <p style={{ color: '#524842', lineHeight: 1.7, marginBottom: '2rem', fontFamily: 'system-ui', fontSize: '0.95rem' }}>
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
              <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1f1815 0%, #4a3830 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{avgRating}</div>
              <div style={{ color: '#a03b1e', fontSize: '1.25rem', marginTop: '0.35rem', display: 'flex', gap: '2px', justifyContent: 'center' }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#786e65', marginTop: '0.35rem', fontFamily: 'system-ui' }}>
                Based on {reviewCount} reviews
              </div>
              <span className="satisfaction-tag">
                {satisfactionRate}% Highly Satisfied
              </span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontFamily: 'serif', fontWeight: 600 }}>Rating Breakdown</h4>
              {starCounts.map((s) => (
                <div key={s.stars} className="progress-bar-container">
                  <span style={{ width: '55px', color: '#786e65', fontWeight: 500 }}>{s.stars} stars</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span style={{ width: '38px', textAlign: 'right', color: '#786e65', fontWeight: 500 }}>{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-layout">
            <div>
              {hasPurchased ? (
                <form action={submitReview} encType="multipart/form-data" className="review-form">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'serif', fontWeight: 500 }}>Write a Review</h3>
                  <input type="text" name="name" placeholder="Your Name" required className="form-input" />

                  <select name="rating" className="form-select" defaultValue="5">
                    <option value="5">★★★★★ (5/5) - Very Satisfied</option>
                    <option value="4">★★★★☆ (4/5) - Satisfied</option>
                    <option value="3">★★★☆☆ (3/5) - Average</option>
                    <option value="2">★★☆☆☆ (2/5) - Unsatisfied</option>
                    <option value="1">★☆☆☆☆ (1/5) - Very Unsatisfied</option>
                  </select>

                  <textarea
                    name="comment"
                    placeholder="Share your experience with this item..."
                    rows={4}
                    required
                    className="form-textarea"
                  />

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: '#524842' }}>
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
                  <div className="warning-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#1f1815', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                      Verified Buyers Only
                    </strong>
                    You must complete a purchase of this product before writing a review.
                  </div>
                </div>
              )}
            </div>

            <div className="reviews-feed-container">
              {reviewList.length > 0 ? (
                reviewList.map((rev) => {
                  const isVideo = rev.image_url && /\.(mp4|webm|ogg|mov)$/i.test(rev.image_url)

                  return (
                    <div key={rev.id} className="review-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#1f1815' }}>{rev.user_name}</strong>
                          <span className="verified-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Verified Owner
                          </span>
                        </div>
                        <span style={{ color: '#a03b1e', display: 'flex', gap: '1px' }}>
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          ))}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#524842', fontSize: '0.9rem', lineHeight: 1.6 }}>{rev.comment}</p>

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
                <div style={{ background: '#ffffff', padding: '3rem 2rem', borderRadius: '12px', textAlign: 'center', color: '#786e65', border: '1px solid #e8e2d9', fontFamily: 'system-ui' }}>
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
                      <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem', color: '#1f1815' }}>
                        {rel.title}
                      </strong>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', background: 'linear-gradient(135deg, #a03b1e 0%, #73220b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

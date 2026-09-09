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
      {/* Edge-to-Edge Fixed Header */}
      <header className="page-header">
        <div className="nav-inner">
          <UserNav />
        </div>
      </header>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .product-details-page {
          background: linear-gradient(135deg, #faf8f5 0%, #f3ede2 100%);
          min-height: 100vh;
          font-family: serif;
          color: #1f1815;
          padding-top: 110px;
          padding-bottom: 5rem;
          position: relative;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .page-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          width: 100vw;
          background: rgba(250, 248, 245, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(232, 226, 217, 0.6);
          margin: 0;
          box-shadow: 0 4px 20px rgba(31, 24, 21, 0.02);
        }

        .nav-inner {
          width: 100%;
          max-width: 100%;
          padding: 0.75rem 2rem;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .product-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          margin-bottom: 4rem;
        }

        @media (min-width: 768px) {
          .product-grid { grid-template-columns: 1fr 1fr; }
        }

        .image-container {
          position: relative;
          aspect-ratio: 1 / 1;
          width: 100%;
          background: linear-gradient(145deg, #f5f2ed, #ede6dc);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(232, 226, 217, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px -10px rgba(31, 24, 21, 0.05);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .image-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px rgba(31, 24, 21, 0.1);
        }

        .image-container img {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .image-container:hover img {
          transform: scale(1.03);
        }

        .product-title {
          font-family: serif;
          font-size: 2.25rem;
          margin: 0 0 0.5rem 0;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        .product-price {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a03b1e, #d9532b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1.5rem;
        }

        .section-heading {
          font-family: serif;
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2dad0;
          padding-bottom: 0.75rem;
          font-weight: 400;
          position: relative;
        }

        .section-heading::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 80px;
          height: 2px;
          background: linear-gradient(90deg, #a03b1e, #d9532b);
        }

        .summary-card {
          background: linear-gradient(145deg, #ffffff, #fcfbfa);
          border: 1px solid rgba(232, 226, 217, 0.8);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          box-shadow: 0 10px 30px -10px rgba(31, 24, 21, 0.03);
          transition: box-shadow 0.3s ease;
        }

        .summary-card:hover {
          box-shadow: 0 15px 35px -10px rgba(31, 24, 21, 0.06);
        }

        @media (min-width: 768px) {
          .summary-card { grid-template-columns: 1fr 2fr; }
        }

        .overall-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #faf7f2, #f2ece1);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          border: 1px solid rgba(232, 226, 217, 0.5);
        }

        .satisfaction-tag {
          background: linear-gradient(135deg, #e6f4ea, #d0ede0);
          color: #137333;
          padding: 0.3rem 0.85rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          margin-top: 0.75rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 2px 6px rgba(19, 115, 51, 0.08);
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
          height: 8px;
          background-color: #f0eae1;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a03b1e, #d9532b);
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
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
          padding: 1.75rem;
          border-radius: 16px;
          border: 1px solid rgba(232, 226, 217, 0.8);
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 30px -10px rgba(31, 24, 21, 0.03);
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e2dad0;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          background: #faf8f5;
          transition: all 0.25s ease;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #a03b1e;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(160, 59, 30, 0.1);
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
          font-size: 0.8rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(31, 24, 21, 0.15);
        }

        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(31, 24, 21, 0.25);
          background: linear-gradient(135deg, #2a211d, #4a3c35);
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
          border: 1px solid rgba(232, 226, 217, 0.8);
          margin-bottom: 1rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 4px 16px rgba(31, 24, 21, 0.02);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .review-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(31, 24, 21, 0.06);
        }

        .review-proof-media {
          position: relative;
          width: 140px;
          height: 100px;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 0.75rem;
          border: 1px solid #e2dad0;
          background: #000;
          transition: transform 0.25s ease;
        }

        .review-proof-media:hover {
          transform: scale(1.02);
        }

        .verified-badge {
          background: #f0f7f4;
          color: #2e7d32;
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
        }

        .purchase-warning {
          background: #ffffff;
          border: 1px solid rgba(232, 226, 217, 0.8);
          padding: 2rem 1.5rem;
          border-radius: 16px;
          text-align: center;
          color: #786e65;
          font-size: 0.9rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 30px -10px rgba(31, 24, 21, 0.03);
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        .related-card {
          background: #ffffff;
          border: 1px solid rgba(232, 226, 217, 0.8);
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(31, 24, 21, 0.03);
        }

        .related-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 32px -8px rgba(31, 24, 21, 0.1);
        }

        .related-img {
          position: relative;
          height: 200px;
          background: #f5f2ed;
          overflow: hidden;
        }

        .related-img img {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
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
            <div style={{ color: '#a03b1e', marginBottom: '1rem', fontFamily: 'system-ui', fontSize: '0.95rem' }}>
              ★ {avgRating} ({reviewCount} reviews)
            </div>
            <div className="product-price">${Number(product.price).toFixed(2)}</div>
            <p style={{ color: '#524842', lineHeight: 1.6, marginBottom: '1.5rem', fontFamily: 'system-ui', fontSize: '0.95rem' }}>
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
              <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, fontFamily: 'system-ui' }}>{avgRating}</div>
              <div style={{ color: '#a03b1e', fontSize: '1.25rem', marginTop: '0.25rem' }}>★★★★★</div>
              <div style={{ fontSize: '0.85rem', color: '#786e65', marginTop: '0.25rem', fontFamily: 'system-ui' }}>
                Based on {reviewCount} reviews
              </div>
              <span className="satisfaction-tag">
                {satisfactionRate}% Highly Satisfied
              </span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontFamily: 'system-ui' }}>Rating Breakdown</h4>
              {starCounts.map((s) => (
                <div key={s.stars} className="progress-bar-container">
                  <span style={{ width: '50px', color: '#786e65' }}>{s.stars} stars</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span style={{ width: '35px', textAlign: 'right', color: '#786e65' }}>{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-layout">
            <div>
              {hasPurchased ? (
                <form action={submitReview} encType="multipart/form-data" className="review-form">
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'serif', fontWeight: 400 }}>Write a Review</h3>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
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
                  <div style={{ display: 'inline-flex', padding: '0.75rem', background: '#faf7f2', borderRadius: '50%', marginBottom: '0.75rem', border: '1px solid #e8e2d9' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a03b1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <strong style={{ display: 'block', color: '#1f1815', marginBottom: '0.25rem' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <strong>{rev.user_name}</strong>
                          <span className="verified-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Verified Owner
                          </span>
                        </div>
                        <span style={{ color: '#a03b1e' }}>{'★'.repeat(rev.rating || 5)}</span>
                      </div>
                      <p style={{ margin: 0, color: '#524842', fontSize: '0.9rem' }}>{rev.comment}</p>

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
                <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#786e65', border: '1px solid rgba(232, 226, 217, 0.8)', fontFamily: 'system-ui', boxShadow: '0 4px 16px rgba(31, 24, 21, 0.02)' }}>
                  No customer reviews yet.
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
                      <span style={{ color: '#a03b1e', fontWeight: 700, fontSize: '0.95rem' }}>
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

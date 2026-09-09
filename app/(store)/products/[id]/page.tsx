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
      {/* Fixed Custom UserNav Header Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          background: 'linear-gradient(135deg, #1c1411 0%, #2a1e18 100%)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <UserNav />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .product-details-page {
          background: linear-gradient(180deg, #1a120e 0%, #241812 50%, #150e0a 100%);
          min-height: 100vh;
          font-family: serif;
          color: #f3ede2;
          padding-top: 120px;
          padding-bottom: 6rem;
          position: relative;
        }

        .container {
          max-width: 1150px;
          margin: 0 auto;
          padding: 0 1.5rem;
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
          background: linear-gradient(145deg, #2a1e18, #18110e);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(212, 175, 55, 0.25);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }

        .image-container:hover {
          transform: scale(1.01);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.15);
          border-color: rgba(212, 175, 55, 0.5);
        }

        .product-title {
          font-family: serif;
          font-size: 2.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 400;
          background: linear-gradient(135deg, #fff3e6 0%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.01em;
        }

        .product-price {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #ff7b54, #d4af37);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1.5rem;
        }

        .section-heading {
          font-family: serif;
          font-size: 2rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding-bottom: 0.75rem;
          font-weight: 400;
          color: #f3ede2;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-heading::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(212, 175, 55, 0.4), transparent);
        }

        .summary-card {
          background: linear-gradient(145deg, #261a14, #1b120e);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2.5rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        @media (min-width: 768px) {
          .summary-card { grid-template-columns: 1fr 2fr; }
        }

        .overall-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #302119, #1e1410);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .satisfaction-tag {
          background: linear-gradient(135deg, rgba(30, 80, 45, 0.6), rgba(20, 50, 30, 0.8));
          color: #6ee7b7;
          border: 1px solid rgba(110, 231, 183, 0.3);
          padding: 0.35rem 0.9rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          margin-top: 0.75rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          font-family: system-ui, -apple-system, sans-serif;
          color: #d1c5b4;
        }

        .progress-track {
          flex-grow: 1;
          height: 10px;
          background-color: #160f0c;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a03b1e, #d4af37);
          border-radius: 6px;
          transition: width 1s ease-in-out;
        }

        .reviews-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          margin-bottom: 5rem;
        }

        @media (min-width: 768px) {
          .reviews-layout { grid-template-columns: 1fr 2fr; }
        }

        .review-form {
          background: linear-gradient(145deg, #261a14, #1b120e);
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid rgba(212, 175, 55, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #140e0b;
          border: 1px solid rgba(212, 175, 55, 0.2);
          color: #f3ede2;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #d4af37;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);
          background: #1a120e;
        }

        .btn-submit {
          background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
          color: #1a120e;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.85rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.3);
        }

        .btn-submit:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #e6c555, #c29219);
          box-shadow: 0 10px 25px rgba(212, 175, 55, 0.5);
        }

        .reviews-feed-container {
          max-height: 520px;
          overflow-y: auto;
          padding-right: 0.75rem;
        }

        .reviews-feed-container::-webkit-scrollbar {
          width: 6px;
        }

        .reviews-feed-container::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.3);
          border-radius: 4px;
        }

        .reviews-feed-container::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.6);
        }

        .review-card {
          background: linear-gradient(145deg, #261a14, #1b120e);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.15);
          margin-bottom: 1.25rem;
          font-family: system-ui, -apple-system, sans-serif;
          transition: transform 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .review-card:hover {
          transform: translateY(-3px);
          border-color: rgba(212, 175, 55, 0.4);
        }

        .review-proof-media {
          position: relative;
          width: 150px;
          height: 110px;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 1rem;
          border: 1px solid rgba(212, 175, 55, 0.3);
          background: #000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .verified-badge {
          background: rgba(30, 80, 45, 0.4);
          color: #6ee7b7;
          border: 1px solid rgba(110, 231, 183, 0.2);
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-weight: 600;
          display: inline-block;
          margin-left: 0.75rem;
        }

        .purchase-warning {
          background: linear-gradient(145deg, #261a14, #1b120e);
          border: 1px solid rgba(212, 175, 55, 0.2);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          color: #c5b8a5;
          font-size: 0.95rem;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 2rem;
        }

        .related-card {
          background: linear-gradient(145deg, #261a14, #1b120e);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .related-card:hover {
          transform: translateY(-6px);
          border-color: rgba(212, 175, 55, 0.5);
          box-shadow: 0 20px 40px rgba(0,0,0,0.7), 0 0 20px rgba(212, 175, 55, 0.1);
        }

        .related-img {
          position: relative;
          height: 220px;
          background: #140e0b;
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
              <span style={{ color: '#a3927d', fontFamily: 'system-ui' }}>No Image Available</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="product-title">{product.title}</h1>
            <div style={{ color: '#d4af37', marginBottom: '1.25rem', fontFamily: 'system-ui', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#ffb703', fontSize: '1.1rem' }}>★</span> 
              <strong style={{ color: '#f3ede2' }}>{avgRating}</strong> 
              <span style={{ color: '#a3927d' }}>({reviewCount} verified reviews)</span>
            </div>
            <div className="product-price">${Number(product.price).toFixed(2)}</div>
            <p style={{ color: '#c5b8a5', lineHeight: 1.7, marginBottom: '2rem', fontFamily: 'system-ui', fontSize: '1rem' }}>
              {product.description || 'Elevate your experience with this bespoke, high-quality artisanal masterpiece.'}
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
              <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, fontFamily: 'system-ui', background: 'linear-gradient(135deg, #fff3e6, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{avgRating}</div>
              <div style={{ color: '#ffb703', fontSize: '1.4rem', marginTop: '0.35rem', letterSpacing: '2px' }}>★★★★★</div>
              <div style={{ fontSize: '0.85rem', color: '#a3927d', marginTop: '0.35rem', fontFamily: 'system-ui' }}>
                Based on {reviewCount} reviews
              </div>
              <span className="satisfaction-tag">
                {satisfactionRate}% Highly Satisfied
              </span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontFamily: 'system-ui', color: '#e6decb' }}>Rating Breakdown</h4>
              {starCounts.map((s) => (
                <div key={s.stars} className="progress-bar-container">
                  <span style={{ width: '60px', color: '#a3927d' }}>{s.stars} stars</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', color: '#d4af37', fontWeight: 600 }}>{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-layout">
            <div>
              {hasPurchased ? (
                <form action={submitReview} encType="multipart/form-data" className="review-form">
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'serif', fontWeight: 400, color: '#e6decb' }}>Write a Review</h3>
                  <input type="text" name="name" placeholder="Your Name" required className="form-input" />

                  <select name="rating" className="form-select" defaultValue="5">
                    <option value="5">★★★★★ (5/5) - Exquisite</option>
                    <option value="4">★★★★☆ (4/5) - Exceptional</option>
                    <option value="3">★★★☆☆ (3/5) - Average</option>
                    <option value="2">★★☆☆☆ (2/5) - Unsatisfied</option>
                    <option value="1">★☆☆☆☆ (1/5) - Poor</option>
                  </select>

                  <textarea
                    name="comment"
                    placeholder="Share your detailed experience with this artisanal piece..."
                    rows={4}
                    required
                    className="form-textarea"
                  />

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: '#c5b8a5' }}>
                      Attach Photo or Video Proof (Optional)
                    </label>
                    <input 
                      type="file" 
                      name="media" 
                      accept="image/*,video/*" 
                      className="form-input" 
                      style={{ padding: '0.5rem', cursor: 'pointer' }}
                    />
                  </div>

                  <button type="submit" className="btn-submit">
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="purchase-warning">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                  <strong style={{ display: 'block', color: '#f3ede2', marginBottom: '0.35rem', fontSize: '1.1rem' }}>
                    Verified Buyers Only
                  </strong>
                  You must complete a purchase of this product before sharing your review.
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
                          <strong style={{ color: '#f3ede2', fontSize: '1.05rem' }}>{rev.user_name}</strong>
                          <span className="verified-badge">✓ Verified Owner</span>
                        </div>
                        <span style={{ color: '#ffb703', letterSpacing: '1px' }}>{'★'.repeat(rev.rating || 5)}</span>
                      </div>
                      <p style={{ margin: 0, color: '#c5b8a5', fontSize: '0.95rem', lineHeight: 1.6 }}>{rev.comment}</p>

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
                <div style={{ background: 'linear-gradient(145deg, #261a14, #1b120e)', padding: '3rem', borderRadius: '16px', textAlign: 'center', color: '#a3927d', border: '1px solid rgba(212, 175, 55, 0.15)', fontFamily: 'system-ui' }}>
                  No customer reviews yet. Be the first verified owner to share your feedback.
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
                        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#a3927d', fontFamily: 'system-ui' }}>
                          No Image
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.25rem', fontFamily: 'system-ui' }}>
                      <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.35rem', color: '#f3ede2' }}>
                        {rel.title}
                      </strong>
                      <span style={{ color: '#d4af37', fontWeight: 700, fontSize: '1rem' }}>
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

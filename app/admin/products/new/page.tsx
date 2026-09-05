'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CreateProductPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      let publicImageUrl = ''

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath)

          publicImageUrl = urlData.publicUrl
        }
      }

      const { error: dbError } = await supabase.from('products').insert([
        {
          title,
          description,
          price: parseFloat(price) || 0,
          stock: parseInt(stockQuantity, 10) || 0,
          image_url: publicImageUrl,
          image: publicImageUrl,
        },
      ])

      if (dbError) {
        console.error('Error inserting product:', dbError)
      } else {
        router.push('/admin/products')
      }
    } catch (err) {
      console.error('Failed to create product:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <main style={{ background: '#ffffff', border: '1px solid #e8e2d9', borderRadius: '12px', padding: '2.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e8e2d9', paddingBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: 'serif', fontSize: '2rem', fontWeight: 400, margin: '0 0 0.25rem 0' }}>Create New Product</h1>
          <p style={{ color: '#786e65', fontSize: '0.9rem', margin: 0 }}>Add a new luxury item to your store inventory.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Silk Handcrafted Scarf"
              required
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2dad0', borderRadius: '8px', fontSize: '0.95rem', background: '#faf8f5', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a brief luxury description..."
              rows={4}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2dad0', borderRadius: '8px', fontSize: '0.95rem', background: '#faf8f5', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2dad0', borderRadius: '8px', fontSize: '0.95rem', background: '#faf8f5', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stock Quantity</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="10"
                required
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2dad0', borderRadius: '8px', fontSize: '0.95rem', background: '#faf8f5', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Styled Image Upload Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Product Image</label>
            <div
              style={{
                border: '1.5px dashed #e1dad0',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#faf7f2',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
              
              {/* Cloud Upload Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#c85a3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                </div>
              </div>

              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2b231d', marginBottom: '0.25rem' }}>
                {imageFile ? imageFile.name : 'Click or drop image to upload'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#91877e' }}>
                {imageFile ? 'File ready to upload' : 'PNG, JPG, or WEBP up to 5MB'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Link
              href="/admin/products"
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #e1dad0',
                background: '#ffffff',
                color: '#2b231d',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#c85a3a',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
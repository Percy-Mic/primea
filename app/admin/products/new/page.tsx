'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/AdminNav'
import { usePathname } from 'next/navigation'

export default function CreateProductPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

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
          throw new Error(`Image upload failed: ${uploadError.message}. Make sure the 'product-images' bucket exists and has correct RLS policies.`)
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        publicImageUrl = urlData.publicUrl
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
        throw new Error(`Database error: ${dbError.message}`)
      }

      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      console.error('Failed to create product:', err)
      setErrorMessage(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }

        .page-wrapper {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          padding-top: 105px;
          display: flex;
          flex-direction: column;
        }

        .fixed-header-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1100;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        /* Top Sub-Navigation Bar for Desktop */
        .sub-nav-bar {
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.35rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .sub-nav-links {
          display: flex;
          gap: 0.3rem;
          align-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
          flex-wrap: wrap;
        }

        .sub-nav-link {
          text-decoration: none;
          color: #475569;
          font-weight: 500;
          font-size: 0.83rem;
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .sub-nav-link:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .sub-nav-link.active {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 600;
        }

        .storefront-external-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.83rem;
        }

        .storefront-external-link:hover {
          text-decoration: underline;
        }

        /* Mobile Hamburger Toggle Bar */
        .mobile-menu-toggle-bar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.4rem 1.5rem;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }

        .hamburger-btn {
          background: none;
          border: 1px solid #cbd5e1;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .mobile-dropdown-menu {
          display: none;
          flex-direction: column;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem 1.5rem;
          gap: 0.4rem;
        }

        .mobile-dropdown-menu.open {
          display: flex;
        }

        .mobile-nav-link {
          text-decoration: none;
          color: #475569;
          font-weight: 500;
          font-size: 0.85rem;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
        }

        .mobile-nav-link.active {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 600;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 1.5rem;
          width: 100%;
          max-width: 840px;
          margin: 0 auto;
        }

        .form-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
          width: 100%;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .form-header {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin: 0;
        }

        .error-banner {
          margin-bottom: 1.25rem;
          padding: 0.85rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 8px;
          font-size: 0.88rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.25rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          background: #ffffff;
          color: #0f172a;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-textarea {
          resize: vertical;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .image-upload-wrapper {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background-color 0.15s;
        }

        .image-upload-wrapper:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }

        .file-hidden-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
          z-index: 10;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }

        .preview-img {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }

        .upload-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          margin-bottom: 0.25rem;
        }

        .upload-text {
          font-weight: 600;
          font-size: 0.88rem;
          color: #0f172a;
        }

        .upload-subtext {
          font-size: 0.78rem;
          color: #64748b;
        }

        .form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.75rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-submit {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.4rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.15s;
        }

        .btn-submit:hover:not(:disabled) {
          background: #1e293b;
        }

        .btn-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .sub-nav-bar {
            display: none;
          }
          .mobile-menu-toggle-bar {
            display: flex;
          }
          .page-wrapper {
            padding-top: 110px;
          }
          .form-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .form-card {
            padding: 1.25rem;
          }
        }
      ` }} />

      <div className="fixed-header-container">
        <Header 
          title="Admin Dashboard" 
          description="Real-time store progress and inventory management dashboard"
          userEmail="percymicnono@gmail.com" 
          onLogout={() => {}} 
        />

        {/* Desktop Sub-Navigation Bar */}
        <nav className="sub-nav-bar">
          <ul className="sub-nav-links">
            <li><Link href="/admin/dashboard" className={`sub-nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
            <li><Link href="/admin/orders" className={`sub-nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link></li>
            <li><Link href="/admin/products" className={`sub-nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>Inventory</Link></li>
            <li><Link href="/admin/products/new" className={`sub-nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}>Add Product</Link></li>
          </ul>
          <Link href="/" target="_blank" className="storefront-external-link">
            View Storefront →
          </Link>
        </nav>

        {/* Mobile Hamburger Menu Toggle Bar */}
        <div className="mobile-menu-toggle-bar">
          <button 
            className="hamburger-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰ Menu
          </button>
          <Link href="/" target="_blank" className="storefront-external-link">
            View Storefront →
          </Link>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        <div className={`mobile-dropdown-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <Link 
            href="/admin/dashboard" 
            className={`mobile-nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/admin/orders" 
            className={`mobile-nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Orders
          </Link>
          <Link 
            href="/admin/products" 
            className={`mobile-nav-link ${pathname === '/admin/products' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Inventory
          </Link>
          <Link 
            href="/admin/products/new" 
            className={`mobile-nav-link ${pathname === '/admin/products/new' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Add Product
          </Link>
        </div>
      </div>

      {/* Main Content Form Container */}
      <main className="main-content">
        <div className="form-card">
          <div className="form-header">
            <h1 className="page-title">Create New Product</h1>
            <p className="page-subtitle">Add a new item to your store inventory.</p>
          </div>

          {errorMessage && (
            <div className="error-banner">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Silk Handcrafted Scarf"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief product description..."
                rows={4}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            {/* Styled Image Upload Box */}
            <div className="form-group">
              <label>Product Image</label>
              <div className="image-upload-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-hidden-input"
                />
                
                {imagePreview ? (
                  <div className="upload-content">
                    <img src={imagePreview} alt="Preview" className="preview-img" />
                    <div className="upload-text">{imageFile?.name}</div>
                    <div className="upload-subtext" style={{ color: '#2563eb' }}>Click or drop to replace image</div>
                  </div>
                ) : (
                  <div className="upload-content">
                    <div className="upload-icon-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                    </div>
                    <div className="upload-text">Click or drop image to upload</div>
                    <div className="upload-subtext">PNG, JPG, or WEBP up to 5MB</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <Link href="/admin/products" className="btn-cancel">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? 'Saving Product...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/AdminNav'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  price: number
  stock: number
  image_url?: string
}

export default function InventoryManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('newest')
  const [loading, setLoading] = useState(true)

  // Quick Stock Add
  const [addingId, setAddingId] = useState<string | null>(null)
  const [amountToAdd, setAmountToAdd] = useState<number>(5)

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Product',
          price: Number(item.price || 0),
          stock: Number(item.stock || 0),
          image_url: item.image_url || '',
        }))
        setProducts(formatted)
      }
    } catch (error) {
      console.error('Error fetching products from Supabase:', error)
    } finally {
      setLoading(false)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('products')
      localStorage.removeItem('elara_products')
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleAddStock = async (productId: string, currentStock: number) => {
    const newStock = currentStock + Number(amountToAdd)

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    )
    setAddingId(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)

      if (error) console.error('Failed to update stock:', error)
      await fetchProducts()
    } catch (err) {
      console.error('Failed to sync stock update:', err)
      await fetchProducts()
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setIsSaving(true)

    try {
      const supabase = createClient()
      let imageLink = editingProduct.image_url || ''

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, selectedFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        imageLink = publicUrlData.publicUrl
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...editingProduct,
                image_url: imageLink,
              }
            : p
        )
      )

      const updatePayload = {
        title: editingProduct.title,
        price: Number(editingProduct.price),
        stock: Number(editingProduct.stock),
        image_url: imageLink,
      }

      const { error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', editingProduct.id)

      if (error) {
        console.error('Failed to update product details:', error)
        alert(`Database update error: ${error.message}`)
      }

      setEditingProduct(null)
      setSelectedFile(null)
      setPreviewUrl(null)
      await fetchProducts()
    } catch (err: any) {
      console.error('Failed to update product details:', err)
      alert(`Error uploading/updating product: ${err.message || err}`)
      await fetchProducts()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    setProducts((prev) => prev.filter((p) => p.id !== productId))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) console.error('Failed to delete product:', error)
      await fetchProducts()
    } catch (err) {
      console.error('Failed to delete product:', err)
      await fetchProducts()
    }
  }

  const filteredProducts = products
    .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === 'price-low') return a.price - b.price
      if (sortOption === 'price-high') return b.price - a.price
      if (sortOption === 'stock-low') return a.stock - b.stock
      return 0
    })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val)
  }

  return (
    <div className="page-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          margin: 0;
          padding: 0;
          background-color: #fcfcfc;
        }

        .page-wrapper {
          min-height: 100vh;
          background-color: #fcfcfc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1c1917;
          padding-top: 140px; /* Offset for top AdminNav only; sub-nav is sticky beneath it */
        }

        .fixed-header-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1100;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        /* Top Sub-Navigation Bar */
        .sub-nav-bar {
          position: sticky;
          top: 75px; /* Adjust according to your AdminNav height */
          left: 0;
          right: 0;
          height: 52px;
          background: #ffffff;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          z-index: 1050;
          box-sizing: border-box;
          overflow-x: auto;
          white-space: nowrap;
        }

        .sub-nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .sub-nav-link {
          text-decoration: none;
          color: #525252;
          font-weight: 500;
          font-size: 0.92rem;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .sub-nav-link:hover {
          color: #111111;
          background-color: #f5f5f5;
        }

        .sub-nav-link.active {
          background-color: #1c1917;
          color: #ffffff;
          font-weight: 600;
        }

        .storefront-external-link {
          color: #c2410c;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          margin-left: 1rem;
        }

        .storefront-external-link:hover {
          text-decoration: underline;
        }

        .main-content {
          padding-top: 2rem;
          padding-bottom: 3rem;
          box-sizing: border-box;
        }

        .inventory-container {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        .header-section {
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-family: serif;
          font-size: 2.25rem;
          margin: 0;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #111111;
        }

        .filter-card {
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: #ffffff;
          border: 1px solid #d4d4d4;
          color: #111111;
          border-radius: 8px;
          font-size: 0.92rem;
          outline: none;
          box-sizing: border-box;
        }

        .search-input:focus, .select-input:focus {
          border-color: #111111;
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.05);
        }

        .select-input {
          padding: 0.75rem 1rem;
          background-color: #ffffff;
          border: 1px solid #d4d4d4;
          color: #111111;
          border-radius: 8px;
          font-size: 0.92rem;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
        }

        .btn-apply {
          background-color: #111111;
          color: #ffffff;
          border: none;
          padding: 0.75rem 1.4rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .btn-apply:hover {
          background-color: #262626;
        }

        .inventory-card {
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 14px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          width: 100%;
          overflow-x: auto;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 650px;
        }

        .inventory-table th {
          background-color: #fafafa;
          padding: 1.1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #525252;
          letter-spacing: 0.08em;
          border-bottom: 1px solid #e5e5e5;
        }

        .inventory-table td {
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          font-size: 0.92rem;
          vertical-align: middle;
          color: #171717;
        }

        .inventory-table tr:last-child td {
          border-bottom: none;
        }

        .product-info-cell {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .product-thumb {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #e5e5e5;
          background: #fafafa;
          flex-shrink: 0;
        }

        .thumb-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          border: 1px dashed #d4d4d4;
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: #737373;
          text-align: center;
          flex-shrink: 0;
        }

        .product-title {
          font-weight: 600;
          color: #111111;
          line-height: 1.4;
        }

        .product-id {
          font-size: 0.75rem;
          color: #737373;
          font-family: monospace;
          margin-top: 0.2rem;
        }

        .price-text {
          font-weight: 700;
          color: #111111;
        }

        .stock-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          background-color: #f4f4f5;
          color: #27272a;
          border: 1px solid #e4e4e7;
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-action {
          padding: 0.5rem 0.9rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #d4d4d4;
          background-color: transparent;
          color: #404040;
        }

        .btn-action:hover {
          background-color: #f5f5f5;
          color: #111111;
          border-color: #a3a3a3;
        }

        .btn-delete-btn {
          border-color: rgba(220, 38, 38, 0.2);
          color: #dc2626;
        }

        .btn-delete-btn:hover {
          background-color: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .add-box {
          display: flex;
          gap: 0.4rem;
          align-items: center;
          justify-content: flex-end;
        }

        .add-input {
          width: 60px;
          padding: 0.45rem;
          background: #ffffff;
          border: 1px solid #d4d4d4;
          color: #111111;
          border-radius: 6px;
          text-align: center;
          font-size: 0.85rem;
          outline: none;
          box-sizing: border-box;
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1rem;
        }

        .modal-card {
          background: #ffffff;
          border: 1px solid #e5e5e5;
          width: 100%;
          max-width: 480px;
          border-radius: 16px;
          padding: 2.25rem;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .modal-title {
          font-family: serif;
          font-size: 1.6rem;
          margin: 0 0 1.5rem 0;
          color: #111111;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #525252;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem 0.9rem;
          background: #ffffff;
          border: 1px solid #d4d4d4;
          color: #111111;
          border-radius: 8px;
          font-size: 0.92rem;
          box-sizing: border-box;
          outline: none;
        }

        .image-upload-wrapper {
          border: 2px dashed #d4d4d4;
          border-radius: 10px;
          padding: 1.5rem 1rem;
          text-align: center;
          background: #fafafa;
          cursor: pointer;
          position: relative;
        }

        .file-hidden-input {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .preview-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #d4d4d4;
        }

        .upload-icon {
          width: 28px;
          height: 28px;
          fill: #737373;
        }

        .upload-text {
          font-size: 0.85rem;
          color: #111111;
          font-weight: 600;
        }

        .upload-subtext {
          font-size: 0.75rem;
          color: #737373;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 2rem;
        }

        @media (max-width: 768px) {
          .page-wrapper {
            padding-top: 130px;
          }
          .sub-nav-bar {
            padding: 0 1rem;
            top: 65px;
          }
          .sub-nav-links {
            gap: 0.75rem;
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
        {/* Top Sub-Navigation Bar */}
        <div className="sub-nav-bar">
          <div className="sub-nav-links">
            <Link href="/admin/dashboard" className="sub-nav-link">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="sub-nav-link">
              Orders
            </Link>
            <Link href="/admin/products" className="sub-nav-link active">
              Inventory
            </Link>
            <Link href="/admin/products/new" className="sub-nav-link">
              Add Product
            </Link>
          </div>
          <div>
            <Link href="/" target="_blank" className="storefront-external-link">
              View Storefront →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="inventory-container">
          <div className="header-section">
            <h1 className="page-title">Inventory Management</h1>
          </div>

          <div className="filter-card">
            <input
              type="text"
              placeholder="Filter products by title..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="select-input"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Sort by: Default (Newest)</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="stock-low">Stock: Lowest First</option>
            </select>
            <button className="btn-apply" onClick={fetchProducts}>
              Refresh
            </button>
          </div>

          <div className="inventory-card">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#737373' }}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isAdding = addingId === p.id
                    const imgUrl = p.image_url

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product-info-cell">
                            {imgUrl ? (
                              <img src={imgUrl} alt={p.title} className="product-thumb" />
                            ) : (
                              <div className="thumb-placeholder">No Image</div>
                            )}
                            <div>
                              <div className="product-title">{p.title}</div>
                              <div className="product-id">ID: {p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="price-text">{formatCurrency(p.price)}</td>
                        <td>
                          <span className="stock-badge">{p.stock} in stock</span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            {isAdding ? (
                              <div className="add-box">
                                <input
                                  type="number"
                                  className="add-input"
                                  value={amountToAdd}
                                  onChange={(e) => setAmountToAdd(Number(e.target.value))}
                                  min="1"
                                />
                                <button
                                  className="btn-apply"
                                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.82rem' }}
                                  onClick={() => handleAddStock(p.id, p.stock)}
                                >
                                  + Add
                                </button>
                                <button className="btn-action" onClick={() => setAddingId(null)}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  className="btn-action"
                                  onClick={() => {
                                    setAddingId(p.id)
                                    setAmountToAdd(5)
                                  }}
                                >
                                  + Stock
                                </button>
                                <button
                                  className="btn-action"
                                  onClick={() => {
                                    setEditingProduct(p)
                                    setSelectedFile(null)
                                    setPreviewUrl(null)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-action btn-delete-btn"
                                  onClick={() => handleDeleteProduct(p.id)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#737373' }}>
                      No inventory products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {editingProduct && (
            <div className="modal-overlay">
              <div className="modal-card">
                <h2 className="modal-title">Edit Product</h2>
                <form onSubmit={handleSaveProduct}>
                  <div className="form-group">
                    <label>Product Title</label>
                    <input
                      type="text"
                      value={editingProduct.title}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.price}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Count</label>
                    <input
                      type="number"
                      value={editingProduct.stock}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Product Image</label>
                    <div className="image-upload-wrapper">
                      <input
                        type="file"
                        accept="image/*"
                        className="file-hidden-input"
                        onChange={handleFileChange}
                      />
                      <div className="upload-content">
                        {previewUrl || editingProduct.image_url ? (
                          <img
                            src={previewUrl || editingProduct.image_url}
                            alt="Preview"
                            className="preview-img"
                          />
                        ) : (
                          <svg className="upload-icon" viewBox="0 0 24 24">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                          </svg>
                        )}
                        <div className="upload-text">Click or drag image to upload</div>
                        <div className="upload-subtext">SVG, PNG, JPG or GIF (max. 800x800px)</div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => setEditingProduct(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-apply" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

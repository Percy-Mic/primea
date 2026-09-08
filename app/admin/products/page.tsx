'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/AdminNav'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Product {
  id: string
  title: string
  price: number
  stock: number
  image_url?: string
}

export default function InventoryManagementPage() {
  const pathname = usePathname()

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

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          padding: 1.25rem 1.5rem;
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
        }

        .inventory-container {
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .header-section {
          margin-bottom: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-size: 1.5rem;
          margin: 0;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .filter-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          align-items: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 220px;
          padding: 0.6rem 0.85rem;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 6px;
          font-size: 0.88rem;
          outline: none;
          box-sizing: border-box;
        }

        .search-input:focus, .select-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .select-input {
          padding: 0.6rem 0.85rem;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 6px;
          font-size: 0.88rem;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
        }

        .btn-apply {
          background-color: #0f172a;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.15s;
          white-space: nowrap;
        }

        .btn-apply:hover {
          background-color: #1e293b;
        }

        .inventory-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          width: 100%;
          overflow: hidden;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .inventory-table th {
          background-color: #f8fafc;
          color: #475569;
          padding: 10px 16px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
        }

        .inventory-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          vertical-align: middle;
          color: #0f172a;
        }

        .inventory-table tr:last-child td {
          border-bottom: none;
        }

        .inventory-table tr:hover td {
          background-color: #fafafa;
        }

        .product-info-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .product-thumb {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
        }

        .thumb-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          color: #64748b;
          text-align: center;
          flex-shrink: 0;
        }

        .product-title {
          font-weight: 600;
          color: #0f172a;
          line-height: 1.35;
        }

        .product-id {
          font-size: 0.72rem;
          color: #64748b;
          font-family: monospace;
          margin-top: 0.15rem;
        }

        .price-text {
          font-weight: 700;
          color: #0f172a;
        }

        /* Modern Stock Identifier Design */
        .stock-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #334155;
        }

        .stock-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .stock-dot.high {
          background-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .stock-dot.low {
          background-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }

        .stock-dot.out {
          background-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        /* Nicely Arranged Buttons */
        .actions-cell {
          display: flex;
          gap: 0.35rem;
          justify-content: flex-end;
          align-items: center;
        }

        .btn-action {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .btn-action:hover {
          background-color: #f1f5f9;
          color: #0f172a;
          border-color: #94a3b8;
        }

        .btn-stock-add {
          border-color: #cbd5e1;
          color: #0f172a;
          font-weight: 600;
        }

        .btn-stock-add:hover {
          background-color: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .btn-delete-btn {
          border-color: #fecaca;
          color: #dc2626;
          background-color: #fff5f5;
        }

        .btn-delete-btn:hover {
          background-color: #fee2e2;
          border-color: #f87171;
          color: #b91c1c;
        }

        .add-box {
          display: flex;
          gap: 0.35rem;
          align-items: center;
          justify-content: flex-end;
        }

        .add-input {
          width: 52px;
          padding: 0.4rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 6px;
          text-align: center;
          font-size: 0.82rem;
          outline: none;
          box-sizing: border-box;
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1rem;
        }

        .modal-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 440px;
          border-radius: 12px;
          padding: 1.75rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 1.25rem 0;
          color: #0f172a;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 0.35rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 6px;
          font-size: 0.88rem;
          box-sizing: border-box;
          outline: none;
        }

        .image-upload-wrapper {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 1.25rem 1rem;
          text-align: center;
          background: #f8fafc;
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
          gap: 0.35rem;
        }

        .preview-img {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }

        .upload-icon {
          width: 24px;
          height: 24px;
          fill: #64748b;
        }

        .upload-text {
          font-size: 0.8rem;
          color: #0f172a;
          font-weight: 600;
        }

        .upload-subtext {
          font-size: 0.7rem;
          color: #64748b;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1.5rem;
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

          .inventory-table, 
          .inventory-table tbody, 
          .inventory-table tr, 
          .inventory-table td {
            display: block;
            width: 100%;
            box-sizing: border-box;
          }

          .inventory-table thead {
            display: none;
          }

          .inventory-table tr {
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .inventory-table td {
            padding: 0;
            border-bottom: none;
          }

          .actions-cell, .add-box {
            justify-content: flex-start;
            width: 100%;
            margin-top: 0.25rem;
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
                  <th>STOCK LEVEL</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isAdding = addingId === p.id
                    const imgUrl = p.image_url

                    // Determine stock dot class level
                    const stockDotClass = p.stock > 10 ? 'high' : p.stock > 0 ? 'low' : 'out'

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
                          <div className="stock-indicator">
                            <span className={`stock-dot ${stockDotClass}`} />
                            <span><strong>{p.stock}</strong> units available</span>
                          </div>
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
                                  className="btn-action btn-stock-add"
                                  onClick={() => handleAddStock(p.id, p.stock)}
                                >
                                  Save
                                </button>
                                <button className="btn-action" onClick={() => setAddingId(null)}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  className="btn-action btn-stock-add"
                                  onClick={() => {
                                    setAddingId(p.id)
                                    setAmountToAdd(5)
                                  }}
                                  title="Add Stock"
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
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
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

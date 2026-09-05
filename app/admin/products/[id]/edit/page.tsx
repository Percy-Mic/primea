import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) {
    return <div className="admin-container">Product not found.</div>
  }

  // Get current image URL (handles array format or single string)
  const currentImageUrl = Array.isArray(product.images)
    ? product.images[0] || ''
    : product.image_url || ''

  async function updateProduct(formData: FormData) {
    'use server'
    const title = formData.get('title') as string
    const price = parseFloat(formData.get('price') as string)
    const stock = parseInt(formData.get('stock') as string, 10)
    const imageUrl = formData.get('imageUrl') as string

    const supabase = await createClient()

    await supabase
      .from('products')
      .update({
        title,
        price,
        stock,
        images: [imageUrl], // Updates array column
        image_url: imageUrl, // Fallback if using single string column
      })
      .eq('id', id)

    revalidatePath('/admin/products')
    revalidatePath('/admin/dashboard')
    revalidatePath('/')
    redirect('/admin/products')
  }

  return (
    <div className="admin-container">
      <style>{`
        .admin-container {
          max-width: 650px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1f1815;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .page-title {
          font-family: serif;
          font-size: 2rem;
          margin: 0;
        }
        .edit-form {
          background: #ffffff;
          border: 1px solid #e2dad0;
          padding: 2rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #786e65;
        }
        .form-group input {
          padding: 0.65rem 0.85rem;
          border: 1px solid #e2dad0;
          border-radius: 6px;
          font-size: 0.95rem;
        }
        .image-preview-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .image-preview {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e2dad0;
          background-color: #f9f6f0;
        }
        .actions-bar {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }
        .btn-save {
          background-color: #b06d50;
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-cancel {
          background-color: #f5f2eb;
          color: #1f1815;
          text-decoration: none;
          padding: 0.65rem 1.25rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }
      `}</style>

      <div className="header-bar">
        <h1 className="page-title">Edit Product</h1>
        <Link href="/admin/products" className="btn-cancel">
          ← Back to Products
        </Link>
      </div>

      <form action={updateProduct} className="edit-form">
        <div className="form-group">
          <label htmlFor="title">Product Title</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={product.title}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">Product Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={currentImageUrl}
            placeholder="https://example.com/image.jpg"
            required
          />
          {currentImageUrl && (
            <div className="image-preview-container">
              <img
                src={currentImageUrl}
                alt="Product preview"
                className="image-preview"
              />
              <span style={{ fontSize: '0.8rem', color: '#786e65' }}>
                Current image preview
              </span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="price">Price ($)</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={product.price}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="stock">Stock Inventory</label>
          <input
            id="stock"
            name="stock"
            type="number"
            defaultValue={product.stock}
            required
          />
        </div>

        <div className="actions-bar">
          <Link href="/admin/products" className="btn-cancel">
            Cancel
          </Link>
          <button type="submit" className="btn-save">
            Update Product
          </button>
        </div>
      </form>
    </div>
  )
}
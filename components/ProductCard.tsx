import Link from 'next/link'

export type Product = {
  id: string | number
  title: string
  price: number | string
  images?: string[]
  is_new?: boolean
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <div className="card-image-container">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="card-image"
          />
        ) : (
          <div className="no-image-placeholder">No Image Available</div>
        )}
        {product.is_new && (
          <div className="badge-wrapper">
            <span className="badge">NEW ARRIVAL</span>
          </div>
        )}
      </div>

      <div className="card-details">
        <h3 className="product-title">{product.title}</h3>
        <p className="product-price">
          ${Number(product.price).toFixed(2)}
        </p>
        <Link
          href={`/products/${product.id}`}
          className="btn-view-details"
        >
          View Details
        </Link>
      </div>
    </article>
  )
}
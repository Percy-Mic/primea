'use client'

import React, { useEffect, useState } from 'react'
import UserNav from '@/components/UserNav'

interface OrderItem {
  id?: string
  productId?: string
  name?: string
  price?: number
  quantity?: number
  image?: string
  video?: string
  product?: {
    id?: string
    name?: string
    price?: number
    image?: string
    video?: string
  }
}

interface Order {
  id?: string
  status?: string
  createdAt?: string
  deliveredAt?: string
  total?: number
  items?: OrderItem[]
  userName?: string
  user?: {
    name?: string
  }
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [activeReviewKey, setActiveReviewKey] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [reviewerName, setReviewerName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  const [submittedReviews, setSubmittedReviews] = useState<Record<string, boolean>>({})

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null)

  // Tracking Map Modal State
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null)

  useEffect(() => {
    async function fetchUserOrders() {
      try {
        const response = await fetch('/api/orders')
        if (response.ok) {
          const data = await response.json()
          setOrders(Array.isArray(data) ? data : data.orders || [])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserOrders()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetReviewForm = () => {
    setActiveReviewKey(null)
    setRating(5)
    setHoverRating(0)
    setComment('')
    setReviewerName('')
    setSelectedFile(null)
    setFileType(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const toggleReviewForm = (key: string, order?: Order) => {
    if (activeReviewKey === key) {
      resetReviewForm()
    } else {
      resetReviewForm()
      setActiveReviewKey(key)
      if (order) {
        setReviewerName(order.userName || order.user?.name || '')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)

      const isVideo = file.type.startsWith('video/')
      setFileType(isVideo ? 'video' : 'image')
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFileType(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}?`)) return

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PATCH' })
      if (response.ok) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'Cancelled' } : ord))
        )
      }
    } catch (err) {
      console.error('Failed to cancel order:', err)
    }
  }

  const handleRefundOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to request a refund for order #${orderId}?`)) return

    try {
      const response = await fetch(`/api/orders/${orderId}/refund`, { method: 'POST' })
      if (response.ok) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'Refund Requested' } : ord))
        )
        alert('Refund request submitted successfully.')
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to request refund.')
      }
    } catch (err) {
      console.error('Failed to request refund:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleReviewSubmit = async (productId: string, orderId: string, itemKey: string) => {
    if (!reviewerName.trim()) return alert('Please enter your name for the review.')
    if (!rating || rating < 1) return alert('Please select a star rating.')
    if (!comment.trim()) return alert('Please write a review comment.')
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('productId', productId)
      formData.append('orderId', orderId)
      formData.append('user_name', reviewerName)
      formData.append('userName', reviewerName)
      formData.append('comment', comment)
      formData.append('rating', rating.toString())

      if (selectedFile) {
        formData.append('media', selectedFile)
        formData.append('mediaType', fileType || 'image')
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        alert('Thank you! Your review has been submitted.')
        setSubmittedReviews((prev) => ({ ...prev, [itemKey]: true }))
        resetReviewForm()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to submit review.')
      }
    } catch (error) {
      console.error('Review submit error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewReviews = (productId: string) => {
    window.location.href = `/products/${productId}#reviews`
  }

  const formatCurrency = (amount: unknown) => {
    const num = Number(amount) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  const formatDate = (dateString: unknown) => {
    if (!dateString || typeof dateString !== 'string') return 'Recent'
    const date = new Date(dateString)
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isWithinReviewWindow = (order: Order) => {
    if (!order.deliveredAt) return true 

    const deliveryTime = new Date(order.deliveredAt).getTime()
    if (isNaN(deliveryTime)) return true

    const currentTime = Date.now()
    const diffInDays = (currentTime - deliveryTime) / (1000 * 60 * 60 * 24)

    return diffInDays <= 5
  }

  if (loading) {
    return <div className="loader-container">Loading your orders...</div>
  }

  return (
    <div className="orders-container">
      <style>{`
        .loader-container {
          padding: 8rem 1rem;
          text-align: center;
          color: #78716c;
          font-family: inherit;
        }

        .fixed-usernav-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background-color: #ffffff;
        }

        .orders-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 120px 1.25rem 4rem 1.25rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1c1917;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1c1917;
          letter-spacing: -0.025em;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: #78716c;
          font-size: 0.95rem;
          margin: 0;
        }

        .order-card {
          background-color: #ffffff;
          border: 1px solid #e7e5e4;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
        }

        .order-card-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f5f5f4;
        }

        .order-meta {
          min-width: 0;
          flex: 1 1 auto;
        }

        .order-id {
          font-weight: 700;
          font-size: 1.05rem;
          color: #1c1917;
          word-break: break-word;
        }

        .order-date {
          font-size: 0.85rem;
          color: #78716c;
          margin-top: 0.15rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .status-placed, .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-processing { background-color: #f5f5f4; color: #44403c; }
        .status-shipped { background-color: #fafaf9; color: #1c1917; border: 1px solid #e7e5e4; }
        .status-completed, .status-delivered { background-color: #f0fdf4; color: #166534; }
        .status-cancelled { background-color: #fee2e2; color: #991b1b; }
        .status-refund-requested { background-color: #f3e8ff; color: #6b21a8; }

        .items-list {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
        }

        .item-wrapper {
          border-bottom: 1px dashed #e7e5e4;
          padding: 1.25rem 0;
        }

        .item-wrapper:last-child {
          border-bottom: none;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .item-details {
          display: flex;
          gap: 1rem;
          min-width: 0;
          flex: 1;
        }

        .product-media, .media-placeholder {
          width: 60px;
          height: 60px;
          min-width: 60px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #f5f5f4;
          background-color: #fafaf9;
        }

        .media-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: #a8a29e;
          text-align: center;
          padding: 0.25rem;
        }

        .item-text {
          min-width: 0;
          flex: 1;
        }

        .item-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #1c1917;
          word-break: break-word;
        }

        .item-qty {
          font-size: 0.8rem;
          color: #78716c;
          margin-top: 0.15rem;
        }

        .item-price {
          font-weight: 700;
          font-size: 0.95rem;
          color: #1c1917;
          white-space: nowrap;
          text-align: right;
        }

        .review-button-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.75rem;
        }

        .btn-review-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #1c1917;
          color: #ffffff;
          border: 1px solid #1c1917;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-review-trigger:hover {
          background-color: #292524;
          border-color: #292524;
        }

        .btn-view-reviews {
          display: inline-flex;
          align-items: center;
          background: #f5f5f4;
          color: #44403c;
          border: 1px solid #e7e5e4;
          padding: 0.5rem 0.9rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .btn-view-reviews:hover {
          background-color: #e7e5e4;
          color: #1c1917;
        }

        .review-box {
          background-color: #fafaf9;
          border: 1px solid #e7e5e4;
          border-radius: 14px;
          padding: 1.5rem;
          margin-top: 1.25rem;
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        .review-box-title {
          font-weight: 700;
          font-size: 1rem;
          color: #1c1917;
          letter-spacing: -0.01em;
          margin-bottom: 1.25rem;
        }

        .expired-notice {
          padding: 1rem;
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          color: #92400e;
          font-size: 0.875rem;
          text-align: center;
          font-weight: 500;
        }

        .form-field {
          margin-bottom: 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .field-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #78716c;
          margin-bottom: 0.4rem;
        }

        .optional-tag {
          font-weight: 400;
          color: #a8a29e;
          text-transform: none;
        }

        .star-rating-container {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #ffffff;
          border: 1px solid #e7e5e4;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .star-btn {
          background: transparent;
          border: none;
          font-size: 1.65rem;
          cursor: pointer;
          color: #e7e5e4;
          transition: color 0.15s ease, transform 0.15s ease;
          line-height: 1;
          padding: 0 0.1rem;
        }

        .star-btn:hover, .star-btn.active {
          color: #f59e0b;
        }

        .star-btn:hover {
          transform: scale(1.25);
        }

        .rating-text {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1c1917;
          margin-left: 0.5rem;
        }

        .review-input, .review-textarea {
          width: 100%;
          border: 1px solid #e7e5e4;
          border-radius: 8px;
          padding: 0.75rem 0.9rem;
          font-size: 0.875rem;
          box-sizing: border-box;
          background-color: #ffffff;
          color: #1c1917;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .review-input::placeholder, .review-textarea::placeholder {
          color: #a8a29e;
        }

        .review-input:focus, .review-textarea:focus {
          outline: none;
          border-color: #1c1917;
          box-shadow: 0 0 0 3px rgba(28, 25, 23, 0.08);
        }

        .review-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .custom-file-upload {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed #d6d3d1;
          border-radius: 8px;
          padding: 1.25rem 1rem;
          background-color: #ffffff;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .custom-file-upload:hover {
          border-color: #1c1917;
          background-color: #f5f5f4;
        }

        .hidden-file-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-icon {
          width: 24px;
          height: 24px;
          stroke: #78716c;
          margin-bottom: 0.35rem;
        }

        .upload-text {
          font-size: 0.8rem;
          font-weight: 500;
          color: #44403c;
        }

        .upload-subtext {
          font-size: 0.725rem;
          color: #a8a29e;
          margin-top: 0.15rem;
        }

        .preview-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #e7e5e4;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          margin-top: 0.5rem;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .preview-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          flex: 1;
        }

        .preview-thumb {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid #f5f5f4;
        }

        .preview-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .preview-filename {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1c1917;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .preview-type {
          font-size: 0.7rem;
          color: #78716c;
          text-transform: capitalize;
        }

        .btn-remove-file {
          background: transparent;
          border: none;
          color: #a8a29e;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0.2rem 0.4rem;
          line-height: 1;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .btn-remove-file:hover {
          color: #dc2626;
        }

        .review-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 1.25rem;
          justify-content: flex-end;
        }

        .btn-submit-review {
          background-color: #1c1917;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-submit-review:hover {
          background-color: #292524;
        }

        .btn-cancel-review {
          background-color: #ffffff;
          border: 1px solid #d6d3d1;
          color: #57534e;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-cancel-review:hover {
          background-color: #fafaf9;
        }

        .order-card-footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f5f5f4;
          margin-top: 1rem;
        }

        .btn-cancel-order {
          background-color: #ffffff;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .btn-cancel-order:hover {
          background-color: #fee2e2;
          border-color: #f87171;
        }

        .btn-refund-order {
          background-color: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .btn-refund-order:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        @media (max-width: 640px) {
          .orders-container {
            padding: 100px 0.75rem 2.5rem 0.75rem;
          }
          .order-card {
            padding: 1.15rem;
          }
          .order-card-footer {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .btn-cancel-order, .btn-refund-order {
            width: 100%;
          }
        }
      `}</style>

      {/* Fixed UserNav Wrapper */}
      <div className="fixed-usernav-wrapper">
        <UserNav />
      </div>

      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track shipment progress or manage active purchases</p>
      </div>

      {orders.length === 0 ? (
        <p style={{ color: '#78716c' }}>No active orders found.</p>
      ) : (
        orders.map((order) => {
          const statusRaw = (order.status || '').toLowerCase()
          const orderId = order.id || 'Order'
          const date = formatDate(order.createdAt)
          
          let rawItems: any[] = []
          if (Array.isArray(order.items)) {
            rawItems = order.items
          } else if (typeof order.items === 'string') {
            try {
              const parsed = JSON.parse(order.items)
              if (Array.isArray(parsed)) rawItems = parsed
            } catch (e) {
              rawItems = []
            }
          }

          let computedTotal = order.total

          if (!computedTotal && rawItems.length > 0) {
            computedTotal = rawItems.reduce((acc: number, item: OrderItem) => {
              const price = Number(item.price || item.product?.price || 0)
              const qty = Number(item.quantity || 1)
              return acc + price * qty
            }, 0)
          }

          const isPlaced = statusRaw === 'placed' || statusRaw === 'pending'
          const isProcessing = statusRaw === 'processing'
          const isShipped = statusRaw === 'shipped'
          const isDelivered = statusRaw === 'delivered' || statusRaw === 'completed'
          const isCancelled = statusRaw === 'cancelled'
          const canCancel = isPlaced || isProcessing

          const reviewEligible = isWithinReviewWindow(order)

          return (
            <div key={orderId} className="order-card">
              <div className="order-card-header">
                <div className="order-meta">
                  <div className="order-id">#{orderId}</div>
                  <div className="order-date">Placed on {date}</div>
                </div>
                <span className={`status-badge status-${statusRaw}`}>
                  {order.status || 'Pending'}
                </span>
              </div>

              {/* TikTok Shop Map Tracker Link / Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0', background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #f5f5f4' }}>
                <div style={{ fontSize: '0.85rem', color: '#44403c', fontWeight: 500 }}>
                  {isCancelled ? 'Order Cancelled' : isDelivered ? 'Package Delivered Successfully' : 'Package is on the way'}
                </div>
                {!isCancelled && (
                  <button
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => setTrackingOrder(order)}
                  >
                    View Map Tracker &rarr;
                  </button>
                )}
              </div>

              <ul className="items-list">
                {rawItems.length > 0 ? (
                  rawItems.map((item: OrderItem, idx: number) => {
                    const productId = item.id || item.productId || item.product?.id
                    const name = item.name || item.product?.name || 'Product Item'
                    const imgUrl = item.image || item.product?.image
                    const videoUrl = item.video || item.product?.video
                    const quantity = item.quantity || 1
                    const price = Number(item.price || item.product?.price || 0)
                    const itemKey = `${orderId}-${productId || idx}`
                    const isReviewOpen = activeReviewKey === itemKey
                    const isSubmitted = submittedReviews[itemKey]

                    return (
                      <li key={itemKey} className="item-wrapper">
                        <div className="item-row">
                          <div className="item-details">
                            {imgUrl ? (
                              <img src={imgUrl} alt={name} className="product-media" />
                            ) : videoUrl ? (
                              <video src={videoUrl} className="product-media" autoPlay loop muted playsInline />
                            ) : (
                              <div className="media-placeholder">No Media</div>
                            )}
                            <div className="item-text">
                              <div className="item-name">{name}</div>
                              <div className="item-qty">Qty: {quantity}</div>

                              {productId && isDelivered && (
                                <div className="review-button-group">
                                  <button
                                    className="btn-review-trigger"
                                    onClick={() => toggleReviewForm(itemKey, order)}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    {isReviewOpen ? 'Close Form' : isSubmitted ? 'Edit Review' : 'Write a Review'}
                                  </button>
                                  {isSubmitted && (
                                    <button
                                      className="btn-view-reviews"
                                      onClick={() => handleViewReviews(productId)}
                                    >
                                      View Review
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="item-price">
                            {formatCurrency(price * quantity)}
                          </div>
                        </div>

                        {isReviewOpen && (
                          <div className="review-box">
                            {!reviewEligible ? (
                              <div className="expired-notice">
                                <strong>Review period expired.</strong> Reviews can only be submitted within 5 days of product delivery.
                              </div>
                            ) : (
                              <>
                                <div className="review-box-title">Write Your Review</div>

                                <div className="form-field">
                                  <label className="field-label">Rating</label>
                                  <div className="star-rating-container">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        className={`star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                      >
                                        ★
                                      </button>
                                    ))}
                                    <span className="rating-text">
                                      {hoverRating || rating} / 5
                                    </span>
                                  </div>
                                </div>

                                <div className="form-field">
                                  <label className="field-label">Your Name</label>
                                  <input
                                    type="text"
                                    className="review-input"
                                    placeholder="Enter your full name"
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                  />
                                </div>

                                <div className="form-field">
                                  <label className="field-label">Review</label>
                                  <textarea
                                    className="review-textarea"
                                    placeholder="Write your experience with this item..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                  />
                                </div>

                                <div className="form-field">
                                  <label className="field-label">
                                    Media Attachment <span className="optional-tag">(Optional)</span>
                                  </label>
                                  {!selectedFile ? (
                                    <div className="custom-file-upload">
                                      <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                        className="hidden-file-input"
                                      />
                                      <svg className="upload-icon" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                      </svg>
                                      <span className="upload-text">Click or drag photo/video to upload</span>
                                      <span className="upload-subtext">Supports PNG, JPG, MP4, etc.</span>
                                    </div>
                                  ) : (
                                    <div className="preview-card">
                                      <div className="preview-content">
                                        {fileType === 'image' && previewUrl ? (
                                          <img src={previewUrl} alt="Preview" className="preview-thumb" />
                                        ) : fileType === 'video' && previewUrl ? (
                                          <video src={previewUrl} className="preview-thumb" />
                                        ) : (
                                          <div className="media-placeholder">File</div>
                                        )}
                                        <div className="preview-info">
                                          <span className="preview-filename">{selectedFile.name}</span>
                                          <span className="preview-type">{fileType} file</span>
                                        </div>
                                      </div>
                                      <button type="button" className="btn-remove-file" onClick={removeFile} title="Remove file">
                                        &times;
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="review-actions">
                                  <button
                                    type="button"
                                    className="btn-cancel-review"
                                    onClick={() => toggleReviewForm(itemKey)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-submit-review"
                                    disabled={submitting}
                                    onClick={() => productId && handleReviewSubmit(productId, orderId, itemKey)}
                                  >
                                    {submitting ? 'Submitting...' : 'Submit Review'}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })
                ) : (
                  <div style={{ fontSize: '0.875rem', color: '#78716c', padding: '0.5rem 0' }}>
                    No items found for this order.
                  </div>
                )}
              </ul>

              <div className="order-card-footer">
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Total: <span style={{ fontWeight: 700, color: '#1c1917' }}>{formatCurrency(computedTotal)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {canCancel && (
                    <button
                      className="btn-cancel-order"
                      onClick={() => handleCancelOrder(orderId)}
                    >
                      Cancel Order
                    </button>
                  )}
                  {isDelivered && (statusRaw as string) !== 'refund requested' && (
                    <button
                      className="btn-refund-order"
                      onClick={() => handleRefundOrder(orderId)}
                    >
                      Request Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* TikTok Shop Style Interactive Map Tracking Modal */}
      {trackingOrder && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', maxWidth: '500px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Order Tracking #{trackingOrder.id}</h3>
              <button 
                onClick={() => setTrackingOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
              >
                &times;
              </button>
            </div>

            {/* Simulated Map Container (TikTok Shop Visual Style) */}
            <div style={{ height: '220px', backgroundColor: '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '100%', height: '100%', opacity: 0.6,
                backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '20px 20px'
              }} />
              
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <path d="M 80 150 Q 200 50, 420 120" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="6 6" />
              </svg>

              <div style={{ position: 'absolute', top: '130px', left: '70px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#1e293b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Hub</div>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#1e293b', borderRadius: '50%', margin: '4px auto', border: '2px solid #fff' }} />
              </div>

              <div style={{ position: 'absolute', top: '75px', left: '230px', background: '#2563eb', color: '#fff', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🚚 Out for Delivery
              </div>

              <div style={{ position: 'absolute', top: '100px', left: '410px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Delivery Address</div>
                <div style={{ width: '14px', height: '14px', backgroundColor: '#16a34a', borderRadius: '50%', margin: '4px auto', border: '2px solid #fff' }} />
              </div>
            </div>

            {/* Timeline Steps */}
            <div style={{ padding: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#374151' }}>Latest Logistics Update</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>[Out for Delivery] Courier rider is heading to your drop-off point.</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>Today, 10:45 AM</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>[Arrived at Local Hub] Sorting completed at sorting center.</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>Yesterday, 8:30 PM</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>[Order Placed] Package packed and handed over to logistics partner.</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>2 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

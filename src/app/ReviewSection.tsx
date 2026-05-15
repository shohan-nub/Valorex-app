'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  user_id: string
}

export default function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const [canReview, setCanReview] = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: rv } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      setReviews((rv as Review[]) || [])

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const already = (rv || []).some((r: Review) => r.user_id === user.id)
      setAlreadyReviewed(already)

      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_items(product_id)')
        .eq('user_id', user.id)
        .eq('status', 'delivered')

      const hasDelivered = (orders || []).some(order =>
        (order.order_items as { product_id: string }[]).some(
          item => item.product_id === productId
        )
      )

      setCanReview(hasDelivered)
      setLoading(false)
    }

    load()
  }, [productId])

  async function handleSubmit() {
    if (!comment.trim() || !userId) return

    setSubmitting(true)

    const supabase = createClient()

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      user_id: userId,
      rating,
      comment: comment.trim(),
    })

    if (!error) {
      setReviews(prev => [
        {
          id: crypto.randomUUID(),
          rating,
          comment: comment.trim(),
          created_at: new Date().toISOString(),
          user_id: userId,
        },
        ...prev,
      ])

      setAlreadyReviewed(true)
      setCanReview(false)
      setComment('')
    }

    setSubmitting(false)
  }

  const visibleReviews = showAll ? reviews : reviews.slice(0, 2)

  return (
    <section id="review" className="mt-10">
      <h2 className="mb-4 text-xl font-bold">Reviews ({reviews.length})</h2>

      {!loading && canReview && !alreadyReviewed && (
        <div className="mb-6 rounded-xl border p-4">
          <p className="mb-2 font-semibold">Review দাও</p>

          <div className="mb-3 flex gap-2">
            {[5, 4, 3, 2, 1].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-lg ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a Review"
            className="mb-3 w-full rounded border p-2"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded bg-green-700 px-4 py-2 text-white"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      {!loading && !canReview && !alreadyReviewed && userId && (
        <p className="mb-4 text-sm text-gray-500">
          
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-400">No reviews yet</p>
      ) : (
        <>
          <div className="space-y-3">
            {visibleReviews.map(r => (
              <div key={r.id} className="rounded-xl border p-3">
                <div className="mb-1 text-sm text-yellow-500">
                  {'★'.repeat(r.rating)}
                </div>
                <p className="text-sm">{r.comment}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {reviews.length > 2 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-3 text-sm text-green-700"
            >
              {showAll ? 'Show less' : 'See more'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
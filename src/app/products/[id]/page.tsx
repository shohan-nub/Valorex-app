'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCart } from '../../Cartcontext'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import ReviewSection from '@/app/ReviewSection'

interface ProductData {
  id: string
  name: string
  price: number
  description: string
  image_url: string
  extra_images: string[]
  sizes: string[]
  stock: number
  category: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
}

interface RelatedProduct {
  id: string
  name: string
  price: number
  image_url: string
  stock: number
  category: string
}

const FALLBACK_IMAGE = '/placeholder.png'

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getVisibleCount(width: number) {
  if (width >= 1536) return 8
  if (width >= 1280) return 7
  if (width >= 1024) return 6
  if (width >= 768) return 5
  if (width >= 640) return 4
  return 4
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const router = useRouter()
  const { addItem, items } = useCart()

  const [product, setProduct] = useState<ProductData | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [selectedSize, setSelectedSize] = useState('')
  const [activeImage, setActiveImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(4)

  const sizeGuide = [
    { size: 'S', chest: '36–38"', fit: 'Slim fit' },
    { size: 'M', chest: '38–40"', fit: 'Regular fit' },
    { size: 'L', chest: '40–42"', fit: 'Comfort fit' },
    { size: 'XL', chest: '42–44"', fit: 'Relaxed fit' },
  ]

  const policyPoints = [
    'Return possible within 1 day',
    'Item must be unused & fresh condition',
    'Exchange available if stock exists',
  ]

  useEffect(() => {
    const updateCount = () => setVisibleCount(getVisibleCount(window.innerWidth))
    updateCount()
    window.addEventListener('resize', updateCount)
    return () => window.removeEventListener('resize', updateCount)
  }, [])

  useEffect(() => {
    if (!id) return

    async function fetchData() {
      const supabase = createClient()

      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }),
      ])

      if (p) {
        setProduct(p as ProductData)
        setActiveImage((p as ProductData).image_url || FALLBACK_IMAGE)
      }

      setReviews((r || []) as Review[])
      setLoading(false)
    }

    fetchData()
  }, [id])

  useEffect(() => {
    const category = product?.category

    if (!category || !id) return

    async function fetchRelated() {
      const supabase = createClient()

      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock, category')
        .eq('category', category)
        .neq('id', id)
        .limit(24)

      const randomized = shuffleArray((data as RelatedProduct[]) || [])
      setRelatedProducts(randomized)
    }

    fetchRelated()
  }, [product?.category, id])

  const avgRating = useMemo(() => {
    return reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null
  }, [reviews])

  const quantityInCart = useMemo(() => {
    if (!product) return 0
    return items
      .filter((item) => item.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0)
  }, [items, product])

  const outOfStock = !product || product.stock <= 0

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  function addToCartOrBuyNow(nextRoute: '/cart' | '/checkout') {
    if (!product) return

    if (product.sizes?.length > 0 && !selectedSize) {
      alert('Please select a size')
      return
    }

    if (product.stock <= 0) {
      alert('Sorry, no stock left for this product.')
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      size: selectedSize,
      quantity: 1,
    })

    router.push(nextRoute)
  }

  function handleAddToCart() {
    addToCartOrBuyNow('/cart')
  }

  function handleBuyNow() {
    addToCartOrBuyNow('/checkout')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafcf9] px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-[#00612E]/10 bg-white p-6 shadow-sm sm:p-10">
          <div className="h-6 w-40 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-[24px] bg-slate-100" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-1/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#fafcf9] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#00612E]/10 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">Product not found.</p>
          <Link href="/" className="mt-4 inline-flex rounded-full bg-[#00612E] px-5 py-2.5 text-sm font-semibold text-white">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const allImages = [product.image_url, ...(product.extra_images || [])].filter(Boolean)
  const relatedToShow = relatedProducts.slice(0, visibleCount)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fbfcfa_0%,#f6f8f5_100%)]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }

        @keyframes floatSoft {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float-soft { animation: floatSoft 7s ease-in-out infinite; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#00612E]/10 blur-3xl float-soft" />
        <div
          className="absolute top-40 -left-16 h-64 w-64 rounded-full bg-[#FDFFE3]/90 blur-3xl float-soft"
          style={{ animationDelay: '1.2s' }}
        />
        <div
          className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-[#00612E]/6 blur-3xl float-soft"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-5 flex items-center justify-between gap-3 fade-up">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border border-[#00612E]/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            ← Back
          </button>
          <span className="rounded-full border border-[#00612E]/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#00612E] shadow-sm">
            Product Details
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <section className="fade-up">
            <div className="rounded-[30px] border border-white/80 bg-white p-3 shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:p-4">
              <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[#f7faf7]">
                <div className="absolute inset-0 shimmer opacity-20" />
                <Image
                  src={activeImage || FALLBACK_IMAGE}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </div>

              {allImages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={`${img}-${i}`}
                      onClick={() => setActiveImage(img)}
                      className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                        activeImage === img
                          ? 'border-[#00612E] scale-105 shadow-md'
                          : 'border-[#e6eee6] hover:border-[#00612E]/35'
                      }`}
                    >
                      <Image src={img || FALLBACK_IMAGE} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="fade-up lg:sticky lg:top-6">
            <div className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur sm:p-7">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#00612E]/8 px-3 py-1 text-[11px] font-semibold text-[#00612E]">
                  {product.category.replaceAll('_', ' ')}
                </span>
                <span className="rounded-full bg-[#FDFFE3] px-3 py-1 text-[11px] font-semibold text-[#8a6d1a]">
                  {outOfStock ? 'Out of stock' : `${product.stock} left`}
                </span>
                {avgRating && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    ⭐ {avgRating} / 5
                  </span>
                )}
              </div>

              <div className="mt-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {product.description || 'Premium jersey with clean finishing and responsive sizing.'}
                </p>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4 rounded-[24px] bg-[linear-gradient(180deg,#f8fbf8_0%,#ffffff_100%)] p-4 sm:p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[3px] text-slate-500">Price</p>
                  <p className="mt-1 text-3xl font-black text-[#00612E]">৳{product.price}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p className="font-semibold text-slate-700">In cart</p>
                  <p>{quantityInCart} already added</p>
                </div>
              </div>

              {product.sizes?.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Select Size</p>
                    <p className="text-xs text-slate-400">Choose one before checkout</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-14 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${
                          selectedSize === size
                            ? 'border-[#00612E] bg-[#00612E] text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#00612E]/30 hover:bg-[#00612E]/5'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[24px] border border-[#00612E]/10 bg-[#fafdf9] p-5">
                    <p className="text-sm font-semibold text-slate-800">Size Guide</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {sizeGuide.map((item) => (
                        <div
                          key={item.size}
                          className="rounded-2xl border border-[#00612E]/10 bg-white p-3 text-center shadow-sm transition hover:shadow-md"
                        >
                          <p className="text-base font-bold text-[#00612E]">{item.size}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.chest}</p>
                          <p className="text-[11px] text-slate-400">{item.fit}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-[#00612E]/10 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">Quick Policies</p>

                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {policyPoints.map((point) => (
                        <div key={point} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[#00612E]" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="rounded-full border border-[#00612E] bg-white px-5 py-3 text-sm font-semibold text-[#00612E] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00612E]/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="rounded-full bg-[#00612E] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy Now
                </button>
              </div>

              {product.description && (
                <div className="mt-6 rounded-[24px] border border-[#00612E]/10 bg-[#fafdf9] p-4">
                  <p className="text-sm font-semibold text-slate-800">Description</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{product.description}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-10 fade-up">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[4px] text-[#00612E]/60">More from this category</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">You may also like</h2>
            </div>
          </div>

          {relatedToShow.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#00612E]/15 bg-white p-8 text-sm text-slate-500 shadow-sm">
              No more products in this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 sm:gap-4">
              {relatedToShow.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f7faf7]">
                    <Image
                      src={item.image_url || FALLBACK_IMAGE}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-[#00612E]">৳{item.price}</span>
                      <span className="rounded-full bg-[#00612E]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[#00612E]">
                        {item.stock > 0 ? 'Available' : 'Sold'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <ReviewSection productId={product.id} />
      </div>
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '../../Cartcontext'
import { createClient } from '@/app/lib/supabase/client'
import ReviewSection from '@/app/ReviewSection'

interface ProductData {
  id: string
  name: string
  price: number
  description: string
  desc_section1_title?: string | null
  desc_section1_body?: string | null
  desc_section2_title?: string | null
  desc_section2_body?: string | null
  image_url: string | null
  extra_images: string[] | null
  sizes: string[] | null
  stock: number
  category: string
  full_sleeve_extra_price?: number | null
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
  image_url: string | null
  stock: number
  category: string
}

type SleeveType = 'regular' | 'full'

const FALLBACK = '/placeholder.png'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalizeImages(primary?: string | null, extras?: string[] | null): string[] {
  const all = [primary, ...(extras ?? [])]
  const cleaned = all
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map(x => x.trim())
  return [...new Set(cleaned)]
}

function SectionCard({ title, body }: { title?: string | null; body?: string | null }) {
  if (!title && !body) return null
  return (
    <div className="rounded-2xl border border-[#00612E]/10 bg-[#fafdf9] p-4">
      {title && <p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#00612E]/60 mb-2">{title}</p>}
      {body && <p className="text-sm leading-7 text-slate-600 whitespace-pre-line break-words">{body}</p>}
    </div>
  )
}

const SIZE_GUIDE = [
  { size: 'S', chest: '36–38"', fit: 'Slim' },
  { size: 'M', chest: '38–40"', fit: 'Regular' },
  { size: 'L', chest: '40–42"', fit: 'Comfort' },
  { size: 'XL', chest: '42–44"', fit: 'Relaxed' },
]

const POLICIES = [
  'Return possible within 1 day',
  'Item must be unused and in fresh condition',
  'Exchange available if stock exists',
]

export default function ProductDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { addItem, items } = useCart()

  const [product, setProduct] = useState<ProductData | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [related, setRelated] = useState<RelatedProduct[]>([])
  const [selectedSize, setSelectedSize] = useState('')
  const [sleeve, setSleeve] = useState<SleeveType>('regular')
  const [activeImg, setActiveImg] = useState(FALLBACK)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [relatedCount, setRelatedCount] = useState(4)

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      setRelatedCount(w >= 1536 ? 8 : w >= 1280 ? 6 : w >= 1024 ? 4 : w >= 640 ? 3 : 2)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setProduct(null)
    setSelectedSize('')
    setSleeve('regular')
    setActiveImg(FALLBACK)
    setImgLoaded(false)

    async function fetchProduct() {
      try {
        const sb = createClient()
        const [{ data: p, error: pe }, { data: r }] = await Promise.all([
          sb.from('products').select('*').eq('id', id).single(),
          sb.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (pe) throw pe
        if (p) {
          setProduct(p as ProductData)
          const imgs = normalizeImages(p.image_url, p.extra_images)
          setActiveImg(imgs[0] || FALLBACK)
        }
        setReviews((r ?? []) as Review[])
      } catch {
        if (!cancelled) setError('Product load করা যায়নি।')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProduct()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!product?.category || !id) return
    let cancelled = false
    createClient()
      .from('products')
      .select('id, name, price, image_url, stock, category')
      .eq('category', product.category)
      .neq('id', id)
      .limit(24)
      .then(({ data }) => {
        if (!cancelled) setRelated(shuffle((data ?? []) as RelatedProduct[]))
      })
    return () => { cancelled = true }
  }, [product?.category, id])

  const allImages = useMemo(() => {
    if (!product) return [FALLBACK]
    const imgs = normalizeImages(product.image_url, product.extra_images)
    return imgs.length ? imgs : [FALLBACK]
  }, [product])

  const sleeveExtra = Number(product?.full_sleeve_extra_price ?? 0)
  const finalPrice = (product?.price ?? 0) + (sleeve === 'full' ? sleeveExtra : 0)
  const outOfStock = !product || product.stock <= 0
  const hasSleeveOpt = sleeveExtra > 0

  const avgRating = useMemo(() => {
    if (!reviews.length) return null
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  }, [reviews])

  const inCartQty = useMemo(() => {
    if (!product) return 0
    return items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0)
  }, [items, product])

  function handleCTA(route: '/cart' | '/checkout') {
    if (!product) return
    if (product.sizes?.length && !selectedSize) return alert('Please select a size')
    if (product.stock <= 0) return alert('Out of stock')
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image_url: product.image_url || FALLBACK,
      size: selectedSize,
      quantity: 1,
    } as any)
    router.push(route)
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(180deg,#fbfcfa,#f6f8f5)' }}>
      <div className="mx-auto max-w-7xl">
        <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100 mb-6" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-slate-100" />
          <div className="space-y-4">
            {[48, 32, 80, 48, 48].map((h, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-100" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="rounded-3xl border border-[#00612E]/10 bg-white p-8 text-center shadow-sm max-w-sm w-full">
        <p className="text-sm text-slate-500 mb-4">{error ?? 'Product not found.'}</p>
        <Link href="/" className="inline-flex rounded-full bg-[#00612E] px-5 py-2.5 text-sm font-semibold text-white">
          Back to Home
        </Link>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg,#fbfcfa 0%,#f6f8f5 100%)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .fu { animation: fadeUp .6s ease both }
        .float { animation: floatY 7s ease-in-out infinite }
      `}</style>

      {/* bg glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="float absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-[#00612E]/8 blur-3xl" />
        <div className="float absolute top-40 -left-10 h-56 w-56 rounded-full bg-[#FDFFE3]/60 blur-3xl" style={{ animationDelay: '1s' }} />
        <div className="float absolute bottom-20 right-0 h-64 w-64 rounded-full bg-[#00612E]/5 blur-3xl" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">

        {/* breadcrumb */}
        <div className="fu mb-5 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => window.history.length > 1 ? router.back() : router.push('/')}
            className="inline-flex items-center gap-2 rounded-full border border-[#00612E]/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            ← Back
          </button>
          <span className="rounded-full border border-[#00612E]/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#00612E] shadow-sm">
            Product Details
          </span>
        </div>

        {/* main grid */}
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-8 xl:grid-cols-[1.1fr_0.9fr]">

          {/* ── Image section ── */}
          <section className="fu min-w-0">
            <div className="rounded-3xl border border-white/80 bg-white shadow-[0_16px_60px_rgba(0,0,0,0.06)] overflow-hidden">

              {/* ── MAIN IMAGE — full width, no padding, object-cover ── */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1/1' }}>
                {!imgLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-slate-100" />
                )}
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width:640px) 100vw,(max-width:1024px) 55vw,680px"
                  className={`object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => { setActiveImg(FALLBACK); setImgLoaded(true) }}
                />
              </div>

              {/* thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setActiveImg(img); setImgLoaded(false) }}
                      className={`relative h-16 w-16 sm:h-18 sm:w-18 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                        activeImg === img
                          ? 'border-[#00612E] scale-105 shadow-md'
                          : 'border-slate-200 hover:border-[#00612E]/40'
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Info panel ── */}
          <section className="fu min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.06)] backdrop-blur sm:p-6">

              {/* badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="rounded-full bg-[#00612E]/8 px-3 py-1 text-[11px] font-semibold text-[#00612E]">
                  {product.category.replaceAll('_', ' ')}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${outOfStock ? 'bg-red-50 text-red-600' : 'bg-[#FDFFE3] text-[#8a6d1a]'}`}>
                  {outOfStock ? 'Out of stock' : `${product.stock} left`}
                </span>
                {avgRating && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    ⭐ {avgRating}/5
                  </span>
                )}
              </div>

              {/* name + desc */}
              <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                {product.name}
              </h1>
              {product.description && (
                <p className="mt-2 text-sm leading-6 text-slate-500 break-words">{product.description}</p>
              )}

              {/* price */}
              <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-gradient-to-b from-[#f8fbf8] to-white p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[3px] text-slate-400">Price</p>
                  <p className="mt-1 text-3xl font-black text-[#00612E]">৳{finalPrice}</p>
                  {hasSleeveOpt && sleeve === 'full' && (
                    <p className="text-xs text-slate-400 mt-0.5">Base ৳{product.price} + Full sleeve ৳{sleeveExtra}</p>
                  )}
                </div>
                {inCartQty > 0 && (
                  <div className="text-right text-sm text-slate-500">
                    <p className="font-semibold text-slate-700">In cart</p>
                    <p>{inCartQty} added</p>
                  </div>
                )}
              </div>

              {/* sleeve option */}
              {hasSleeveOpt && (
                <div className="mt-4 rounded-2xl border border-[#00612E]/10 bg-[#fafdf9] p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Sleeve Option</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['regular', 'full'] as SleeveType[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSleeve(s)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                          sleeve === s
                            ? 'border-[#00612E] bg-[#00612E] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-[#00612E]/30'
                        }`}
                      >
                        {s === 'regular' ? 'Regular' : 'Full Sleeve'}
                        <span className="block text-xs opacity-75 mt-0.5">
                          {s === 'regular' ? 'No extra charge' : `+৳${sleeveExtra}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* sizes */}
              {!!product.sizes?.length && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-800">Select Size</p>
                    <p className="text-xs text-slate-400">Required</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                          selectedSize === size
                            ? 'border-[#00612E] bg-[#00612E] text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#00612E]/30 hover:bg-[#00612E]/5'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  {/* size guide */}
                  <div className="mt-4 rounded-2xl border border-[#00612E]/10 bg-[#fafdf9] p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Size Guide</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {SIZE_GUIDE.map(g => (
                        <div key={g.size} className="rounded-xl border border-[#00612E]/10 bg-white p-2.5 text-center shadow-sm">
                          <p className="text-sm font-bold text-[#00612E]">{g.size}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{g.chest}</p>
                          <p className="text-[10px] text-slate-400">{g.fit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCTA('/cart')}
                  disabled={outOfStock}
                  className="rounded-full border border-[#00612E] bg-white py-3 text-sm font-semibold text-[#00612E] transition hover:-translate-y-0.5 hover:bg-[#00612E]/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => handleCTA('/checkout')}
                  disabled={outOfStock}
                  className="rounded-full bg-[#00612E] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>

              {/* policies */}
              <div className="mt-4 rounded-2xl border border-[#00612E]/10 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-2">Policies</p>
                <ul className="space-y-1.5">
                  {POLICIES.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#00612E]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* extra desc sections */}
              {(product.desc_section1_title || product.desc_section1_body ||
                product.desc_section2_title || product.desc_section2_body) && (
                <div className="mt-4 space-y-3">
                  <SectionCard title={product.desc_section1_title} body={product.desc_section1_body} />
                  <SectionCard title={product.desc_section2_title} body={product.desc_section2_body} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Related ── */}
        {related.length > 0 && (
          <section className="fu mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[4px] text-[#00612E]/60 mb-1">
              More from this category
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-4 sm:text-2xl">You may also like</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
              {related.slice(0, relatedCount).map((item, i) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative w-full overflow-hidden bg-[#f7faf7]" style={{ aspectRatio: '4/5' }}>
                    <Image
                      src={item.image_url || FALLBACK}
                      alt={item.name}
                      fill
                      unoptimized
                      sizes="(max-width:640px) 50vw,25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900 break-words">{item.name}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#00612E]">৳{item.price}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        item.stock > 0 ? 'bg-[#00612E]/8 text-[#00612E]' : 'bg-red-50 text-red-500'
                      }`}>
                        {item.stock > 0 ? 'In stock' : 'Sold'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        <div className="fu mt-10 pb-10">
          <ReviewSection productId={product.id} />
        </div>
      </div>
    </div>
  )
}
import { unstable_noStore as noStore } from 'next/cache'
import ProductCard from '../app/Productcard'
import Link from 'next/link'
import PromoPopup from '../app/Promopopup'
import { createClient } from './lib/supabase/client'
import HeroSlideshow from './Herosection/HeroSlideshow'
import CategorySlideshow from './CategorySlideshow'
import HeroSection from './Herosection/page'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type CategoryMeta = {
  slug: string
  label: string
  short: string
  title: string
  subtitle: string
}

type Product = {
  id: string
  name: string
  price: number
  image_url: string
  stock?: number | null
}

const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'top_pick',
    label: 'Top Pick',
    short: 'TP',
    title: 'Top Picks',
    subtitle: 'Best sellers & editor\'s choice',
  },
  {
    slug: 'club',
    label: 'Club',
    short: 'CL',
    title: 'Club Jerseys',
    subtitle: 'Fresh drops for every fan',
  },
  {
    slug: 'retro',
    label: 'Retro',
    short: 'RT',
    title: 'Retro Classics',
    subtitle: 'Old-school mood, modern comfort',
  },
  {
    slug: 'national',
    label: 'National',
    short: 'NT',
    title: 'National Pride',
    subtitle: 'Team colors, iconic energy',
  },
]

const PRODUCTS_PER_CATEGORY = 8

async function getCategoryProducts(category: string): Promise<Product[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, price, image_url, stock')
    .eq('category', category)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(PRODUCTS_PER_CATEGORY)

  return (data as Product[]) || []
}

async function getNewestProduct(): Promise<Product | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, price, image_url, stock')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as Product | null) || null
}

export default async function HomePage() {
  noStore()

  const [topPick, club, retro, national, promoProduct] = await Promise.all([
    getCategoryProducts('top_pick'),
    getCategoryProducts('club'),
    getCategoryProducts('retro'),
    getCategoryProducts('national'),
    getNewestProduct(),
  ])

  const categoryData = [
    { ...CATEGORIES[0], products: topPick },
    { ...CATEGORIES[1], products: club },
    { ...CATEGORIES[2], products: retro },
    { ...CATEGORIES[3], products: national },
  ]

  const TICKER_WORDS = [
    'EXCLUSIVE DROP', 'LIMITED EDITION', 'PREMIUM JERSEYS',
    'FREE SHIPPING', 'NEW SEASON', 'WORLD CUP 26', 'RETRO CLASSICS',
  ]

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfa 28%, #f5f8f5 100%)' }}
    >
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-anim { animation: ticker 22s linear infinite; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeSlideUp 0.7s ease both; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <PromoPopup product={promoProduct} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#00612E]/10 blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-[22rem] -left-20 h-72 w-72 rounded-full bg-[#FDFFE3]/80 blur-3xl animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="absolute top-[38rem] right-0 h-80 w-80 rounded-full bg-[#00612E]/6 blur-3xl animate-pulse"
          style={{ animationDuration: '12s' }}
        />
      </div>

      <div className="relative z-10">
        <HeroSection />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: '100% ORIGINAL', sub: 'Premium Quality Jerseys' },
              { title: 'FAST DELIVERY', sub: 'All Over Bangladesh' },
              { title: 'TOP COLLECTION', sub: 'Latest 2026 Drops' },
              { title: 'BEST PRICE', sub: 'Value For Money' },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative rounded-[24px] overflow-hidden bg-white border border-[#00612E]/10 p-6 sm:p-7 flex flex-col justify-between min-h-[160px] sm:min-h-[180px] lg:min-h-[200px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(circle_at_top,rgba(0,97,46,0.06),transparent_60%)]" />

                <div className="relative z-10">
                  <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-800">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {item.sub}
                  </p>
                </div>

                <div className="absolute bottom-2 right-3 text-[40px] sm:text-[48px] font-black text-[#00612E]/5 select-none pointer-events-none">
                  {item.title.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 space-y-14">
          {categoryData.map((cat, idx) => (
            <section
              key={cat.slug}
              className="scroll-mt-24 fade-up"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="mb-5">
                <div className="transition-transform duration-300 hover:-translate-y-0.5 rounded-[28px] overflow-hidden min-h-[260px] sm:min-h-[300px] lg:min-h-[380px]">
                  <CategorySlideshow
                    categorySlug={cat.slug}
                    categoryLabel={cat.title}
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-500">
                    {cat.products.length > 0
                      ? `${cat.products.length}+ products available`
                      : 'Coming soon'}
                  </p>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-[#00612E]/12 bg-white px-4 py-2 text-sm font-medium text-[#00612E] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    See All
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>

              {cat.products.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-[#00612E]/12 bg-white/60 py-14 flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl border border-[#00612E]/10 bg-[#00612E]/5" />
                  <p className="text-sm text-slate-500">এই category তে এখনো product নেই।</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
                    {cat.products.map((product) => (
                      <div key={product.id} className="transition-transform duration-300 hover:-translate-y-1">
                        <ProductCard
                          product={{
                            ...product,
                            stock: product.stock ?? 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#00612E]/14 bg-white px-7 py-3 text-sm font-medium text-[#0f172a] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00612E]/25 hover:shadow-md"
                    >
                      See More
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </Link>
                  </div>
                </>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
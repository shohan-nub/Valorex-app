'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  category: string
  image_url: string | null
  stock: number
  created_at: string
  full_sleeve_extra_price?: number | null
}

const FALLBACK_IMAGE = '/placeholder.png'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts((data || []) as Product[])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    setDeletingId(id)
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      setProducts((current) => current.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    return list.sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)

      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  const totalProducts = products.length
  const lowStockCount = products.filter((p) => p.stock < 5).length
  const totalExtraPrices = products.filter((p) => (p.full_sleeve_extra_price ?? 0) > 0).length

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading products...</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Products Management</h1>
          <p className="text-sm text-gray-500">Manage your store inventory, base price, and full sleeve extra price</p>
        </div>

        <Link
          href="/adminPanel/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <span className="text-xl leading-none">+</span>
          Add New Product
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Products</p>
          <p className="mt-2 text-2xl font-bold text-gray-800">{totalProducts}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Low Stock</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Sleeve Pricing Set</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{totalExtraPrices}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, id, category"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategoryFilter('all')
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Base Price</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Full Sleeve</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Stock</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => {
                const extra = Number(product.full_sleeve_extra_price ?? 0)
                const hasExtra = extra > 0

                return (
                  <tr key={product.id} className="transition hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                          <Image
                            src={product.image_url || FALLBACK_IMAGE}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900">{product.name}</div>
                          <div className="font-mono text-xs text-gray-400">{product.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-600">
                        {product.category.replaceAll('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">৳{product.price}</div>
                    </td>

                    <td className="px-6 py-4">
                      {hasExtra ? (
                        <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          +৳{extra}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No extra</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className={`text-sm ${product.stock < 5 ? 'font-bold text-red-500' : 'text-gray-600'}`}>
                        {product.stock} pcs
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/adminPanel/products/${product.id}/edit`}
                          className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-900"
                          title="Edit Product"
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="text-sm font-medium text-red-500 transition-colors hover:text-red-700 disabled:opacity-30"
                          title="Delete Product"
                        >
                          {deletingId === product.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-20 text-center text-gray-400">
            No products found. Start by adding one!
          </div>
        )}
      </div>
    </div>
  )
}

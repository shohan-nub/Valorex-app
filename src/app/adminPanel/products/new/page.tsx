'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadToCloudinary } from '../../../lib/supabase/cloudinary'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabase/client'

const CATEGORIES = [
  { value: 'top_pick', label: 'Top Pick' },
  { value: 'club', label: 'Club' },
  { value: 'retro', label: 'Retro' },
  { value: 'national', label: 'National' },
]

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

interface FormState {
  name: string
  description: string
  desc_section1_title: string
  desc_section1_body: string
  desc_section2_title: string
  desc_section2_body: string
  price: string
  full_sleeve_extra_price: string
  category: string
  stock: string
  sizes: string[]
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  desc_section1_title: '',
  desc_section1_body: '',
  desc_section2_title: '',
  desc_section2_body: '',
  price: '',
  full_sleeve_extra_price: '',
  category: 'top_pick',
  stock: '',
  sizes: [],
}

export default function AddProductPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [extraPreviews, setExtraPreviews] = useState<string[]>([])
  const [extraUrls, setExtraUrls] = useState<string[]>([])
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handleExtraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setExtraFiles(files)
    setExtraPreviews(files.map((f) => URL.createObjectURL(f)))
    setExtraUrls([])
  }

  async function handleUploadExtra() {
    if (!extraFiles.length) return
    setUploadingExtra(true)
    try {
      const urls = await Promise.all(
        extraFiles.map((f) => uploadToCloudinary(f).then((r) => r.url)),
      )
      setExtraUrls(urls)
    } catch {
      alert('Image upload failed')
    } finally {
      setUploadingExtra(false)
    }
  }

  function removeExtra(index: number) {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index))
    setExtraPreviews((prev) => prev.filter((_, i) => i !== index))
    setExtraUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }))
  }

  async function handleSubmit() {
    setError('')

    if (!form.name.trim() || !form.price || !form.stock) {
      setError('Name, price এবং stock দেওয়া দরকার।')
      return
    }

    if (!coverFile) {
      setError('Cover image select করো।')
      return
    }

    setLoading(true)

    try {
      const { url: coverUrl, public_id } = await uploadToCloudinary(coverFile)

      let finalExtraUrls = extraUrls
      if (extraFiles.length && extraUrls.length === 0) {
        finalExtraUrls = await Promise.all(
          extraFiles.map((f) => uploadToCloudinary(f).then((r) => r.url)),
        )
      }

      const { error: dbError } = await supabase.from('products').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        desc_section1_title: form.desc_section1_title.trim() || null,
        desc_section1_body: form.desc_section1_body.trim() || null,
        desc_section2_title: form.desc_section2_title.trim() || null,
        desc_section2_body: form.desc_section2_body.trim() || null,
        price: parseFloat(form.price),
        full_sleeve_extra_price: parseFloat(form.full_sleeve_extra_price || '0'),
        category: form.category,
        stock: parseInt(form.stock, 10),
        sizes: form.sizes,
        image_url: coverUrl,
        extra_images: finalExtraUrls,
        cloudinary_public_id: public_id,
        is_active: true,
      })

      if (dbError) throw dbError
      router.push('/adminPanel/products')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00612E]/50 focus:ring-2 focus:ring-[#00612E]/8 transition'
  const textareaCls = `${inputCls} resize-none`
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Add Product</h2>
      </div>

      <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <label className={labelCls}>
            Cover Image <span className="text-red-400">*</span>
            <span className="ml-2 text-xs font-normal text-gray-400">
              Product card এ দেখাবে
            </span>
          </label>

          <label className="block cursor-pointer">
            {coverPreview ? (
              <div className="group relative h-52 w-full overflow-hidden rounded-2xl border border-gray-200">
                <Image src={coverPreview} alt="Cover" fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="text-sm font-medium text-white">Change Image</span>
                </div>
              </div>
            ) : (
              <div className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 transition hover:border-[#00612E]/40 hover:bg-[#00612E]/3">
                <span className="text-3xl">🖼️</span>
                <span className="text-sm text-gray-400">Click to upload cover image</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </label>
        </div>

        <div>
          <label className={labelCls}>
            Extra Images
            <span className="ml-2 text-xs font-normal text-gray-400">Gallery এর জন্য</span>
          </label>

          <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-200">
            📁 Select Images
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleExtraChange} />
          </label>

          {extraPreviews.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {extraPreviews.map((src, i) => (
                  <div key={i} className="group relative">
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <Image src={src} alt={`extra-${i}`} fill className="object-cover" />
                      {extraUrls[i] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                          <span className="text-lg text-green-600">✓</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExtra(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {extraUrls.length === 0 && (
                <button
                  type="button"
                  onClick={handleUploadExtra}
                  disabled={uploadingExtra}
                  className="rounded-xl bg-gray-800 px-4 py-2 text-sm text-white transition hover:bg-gray-700 disabled:opacity-50"
                >
                  {uploadingExtra
                    ? 'Uploading...'
                    : `Upload ${extraFiles.length} image${extraFiles.length > 1 ? 's' : ''}`}
                </button>
              )}

              {extraUrls.length > 0 && (
                <p className="text-xs font-medium text-green-600">
                  ✓ {extraUrls.length} image uploaded
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        <div>
          <label className={labelCls}>
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Barcelona Home Jersey 2024"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>
              Price (৳) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Full Sleeve Extra (৳)</label>
            <input
              type="number"
              min="0"
              placeholder="100"
              value={form.full_sleeve_extra_price}
              onChange={(e) => setField('full_sleeve_extra_price', e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              Regular sleeve এ extra charge হবে না
            </p>
          </div>

          <div>
            <label className={labelCls}>
              Stock <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Available Sizes</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  form.sizes.includes(size)
                    ? 'border-[#00612E] bg-[#00612E] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#00612E]/40'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        <div>
          <label className={labelCls}>
            Short Description
            <span className="ml-2 text-xs font-normal text-gray-400">
              Product card এর নিচে দেখাবে
            </span>
          </label>
          <textarea
            placeholder="Jersey সম্পর্কে সংক্ষিপ্ত বিবরণ..."
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={3}
            className={textareaCls}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-[#00612E]/10 bg-[#fafdf9] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#00612E]/60">
            Description Section 1
          </p>

          <div>
            <label className={labelCls}>Section Heading</label>
            <input
              type="text"
              placeholder="e.g. Features & Material"
              value={form.desc_section1_title}
              onChange={(e) => setField('desc_section1_title', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Section Content</label>
            <textarea
              placeholder="এই section এর বিস্তারিত লেখো..."
              value={form.desc_section1_body}
              onChange={(e) => setField('desc_section1_body', e.target.value)}
              rows={4}
              className={textareaCls}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#00612E]/10 bg-[#fafdf9] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#00612E]/60">
            Description Section 2
          </p>

          <div>
            <label className={labelCls}>Section Heading</label>
            <input
              type="text"
              placeholder="e.g. Size & Fit Guide"
              value={form.desc_section2_title}
              onChange={(e) => setField('desc_section2_title', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Section Content</label>
            <textarea
              placeholder="এই section এর বিস্তারিত লেখো..."
              value={form.desc_section2_body}
              onChange={(e) => setField('desc_section2_body', e.target.value)}
              rows={4}
              className={textareaCls}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-[#00612E] py-3 text-sm font-semibold text-white transition hover:bg-[#00512a] disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </div>
  )
}
'use client'

import Image from "next/image";
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import Link from 'next/link'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanEmail = email.trim()

    if (!name.trim() || !cleanEmail || password.length < 6) {
      setError('All fields required (password min 6 chars).')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      })

      if (error) throw error

      // 🔥 important logic
      if (data.session) {
        // instant login (email confirm OFF)
        router.push(next)
        router.refresh()
      } else {
        // email confirm ON
        setMessage('Account created! Check your email to verify.')
      }

    } catch (err: any) {
      setError(err?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setMessage('')
    setGoogleLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err?.message || 'Google signup failed')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center">
            <Image src="/v2.png" alt="Valorex Logo" width={220} height={100} priority />
          </Link>
          <p className="text-xl text-gray-500">Join the Valorex family</p>
        </div>

        <div className="rounded-3xl border p-6 sm:p-8" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border text-sm font-medium transition hover:opacity-80 mb-6 disabled:opacity-60"
            style={{ borderColor: 'var(--border-2)', color: 'var(--text-1)', background: 'var(--bg-3)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25..." />
            </svg>
            {googleLoading ? 'Connecting...' : 'Sign up with Google'}
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition focus:border-green-600"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
            />

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition focus:border-green-600"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
            />

            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition focus:border-green-600"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
            />

            {error && <p className="text-xs text-red-500">{error}</p>}
            {message && <p className="text-xs text-green-500">{message}</p>}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 btn-accent"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account?</span>{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-green-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
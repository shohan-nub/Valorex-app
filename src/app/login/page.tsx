'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanEmail = email.trim()

    if (!cleanEmail || !password) {
      setError('Please enter email and password.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) throw error

      if (!data.session) {
        throw new Error('Login failed. No session returned.')
      }

      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setMessage('')

    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setError('Please enter your email first.')
      return
    }

    setResetLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage('Password reset link sent to your email.')
    } catch (err: any) {
      setError(err?.message || 'Could not send reset link.')
    } finally {
      setResetLoading(false)
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
      setError(err?.message || 'Google login failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/v2.png"
              alt="Valorex Logo"
              width={220}
              height={100}
              priority
            />
          </Link>
          <p className="mt-3 text-xl text-gray-500">Login to your account</p>
        </div>

        <div
          className="rounded-3xl border p-6 sm:p-8 shadow-sm"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading || resetLoading}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border py-3 text-sm font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: 'var(--border-2)',
              color: 'var(--text-1)',
              background: 'var(--bg-3)',
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-green-600"
              style={{
                background: 'var(--bg-3)',
                borderColor: 'var(--border)',
                color: 'var(--text-1)',
              }}
              autoComplete="email"
            />

            <div className="space-y-2">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-green-600"
                style={{
                  background: 'var(--bg-3)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-1)',
                }}
                autoComplete="current-password"
              />

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-gray-500 transition hover:text-green-600"
                  disabled={loading || googleLoading || resetLoading}
                >
                  {resetLoading ? 'Sending link...' : 'Forgot Password?'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="mt-0.5 text-lg leading-none text-red-500">⚠️</div>
                <div>
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-600">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading || resetLoading}
              className="btn-accent w-full rounded-xl py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <span className="text-gray-500">Don't have an account?</span>{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-bold text-green-600 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
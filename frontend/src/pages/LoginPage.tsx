import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BrainCircuit, Eye, EyeOff, Github, Loader2, Lock, Mail, Sparkles } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { login } from '../store/slices/authSlice'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector((s) => s.auth)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) navigate('/dashboard')
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">

      {/* Left panel — brand */}
      <section className="relative hidden overflow-hidden lg:block">
        <div className="hero-light dark:hero-dark absolute inset-0" />
        <div className="grid-glow absolute inset-0 pointer-events-none" />

        {/* Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-float-1 absolute -left-24 -top-24 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/10 blur-3xl" />
          <div className="orb-float-2 absolute -right-16 bottom-16 h-[300px] w-[300px] rounded-full bg-gradient-to-bl from-violet-400/15 to-pink-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col p-10">
          <Link to="/" className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow-sm">
              <BrainCircuit className="h-5 w-5" />
            </span>
            RAG Studio
          </Link>

          <div className="mt-auto max-w-xl pb-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Answers you can trace
            </div>
            <h1 className="text-display text-balance">Pick up where your documents left off.</h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Search, ask, and keep your best conversations moving.
            </p>

            <div className="glass-panel mt-10 rounded-2xl p-5">
              <div className="rounded-xl bg-foreground/5 p-4 ring-1 ring-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">From your files</p>
                <p className="text-sm leading-6 text-foreground">
                  "The contract requires written notice <strong>45 days</strong> before renewal."
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">contract-2024.pdf · p.7</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">97% match</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right panel — form */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-3 text-sm font-semibold">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow-sm">
                <BrainCircuit className="h-5 w-5" />
              </span>
              RAG Studio
            </Link>
          </div>

          <div className="glass-panel rounded-3xl p-7 sm:p-9">
            <h1 className="text-title">Welcome back</h1>
            <p className="text-subtle mt-2">Good to see you again.</p>

            <button className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
              <Github className="h-4 w-4" /> Continue with GitHub
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or sign in with email <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="group relative block">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background/80 pl-10 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  required
                />
              </label>

              <label className="group relative block">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background/80 pl-10 pr-11 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="rounded border-border" /> Remember me
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              </div>

              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-12 rounded-xl"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

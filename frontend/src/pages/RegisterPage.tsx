import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BrainCircuit, Eye, EyeOff, Lock, Mail, Sparkles, User } from 'lucide-react'
import { useAppDispatch } from '../store/hooks'
import { register } from '../store/slices/authSlice'

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(register(form))
    if (register.fulfilled.match(result)) navigate('/login')
    else setError('Registration failed. Please try again.')
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">

      {/* Left — form */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 text-sm font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow-sm">
              <BrainCircuit className="h-5 w-5" />
            </span>
            RAG Studio
          </Link>

          <div className="glass-panel rounded-3xl p-7 sm:p-9">
            <h1 className="text-title">Create your account</h1>
            <p className="text-subtle mt-2">Bring your documents into one place.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="group relative block">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                <input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="h-12 w-full rounded-xl border border-border bg-background/80 pl-10 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <label className="group relative block">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-12 w-full rounded-xl border border-border bg-background/80 pl-10 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  required
                />
              </label>

              <label className="group relative block">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                className="btn-primary w-full h-12 rounded-xl"
              >
                Create account
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right — brand */}
      <section className="relative hidden overflow-hidden lg:block">
        <div className="hero-light dark:hero-dark absolute inset-0" />
        <div className="grid-glow absolute inset-0 pointer-events-none" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-float-1 absolute -right-24 -top-24 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-violet-400/20 to-indigo-400/10 blur-3xl" />
          <div className="orb-float-3 absolute -left-16 bottom-16 h-[300px] w-[300px] rounded-full bg-gradient-to-tr from-cyan-400/15 to-blue-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-center p-10">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Built for focused work
            </div>
            <h2 className="text-display text-balance">
              Create a home for your team's knowledge.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Add files, ask better questions, and keep the answers easy to verify.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

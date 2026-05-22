import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  BrainCircuit,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  User,
} from 'lucide-react'
import { Button, PageShell, Surface } from '../components/ui/primitives'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addToast } from '../store/slices/uiSlice'
import { changePassword, logout, updateProfile } from '../store/slices/authSlice'

type ThemeChoice = 'system' | 'light' | 'dark'
type DensityChoice = 'comfortable' | 'compact'

const THEME_KEY = 'theme'
const DENSITY_KEY = 'settings:density'
const CITATIONS_KEY = 'settings:citations'
const NOTIFICATIONS_KEY = 'settings:notifications'

function applyTheme(theme: ThemeChoice) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark))
  localStorage.setItem(THEME_KEY, theme)
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
    />
  )
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { accessToken, loading, user } = useAppSelector((s) => s.auth)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '')
  const [theme, setTheme] = useState<ThemeChoice>('system')
  const [density, setDensity] = useState<DensityChoice>('comfortable')
  const [citations, setCitations] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    setFullName(user?.full_name ?? '')
    setJobTitle(user?.job_title ?? '')
    setAvatarUrl(user?.avatar_url ?? '')
  }, [user])

  useEffect(() => {
    setTheme((localStorage.getItem(THEME_KEY) as ThemeChoice | null) ?? 'system')
    setDensity((localStorage.getItem(DENSITY_KEY) as DensityChoice | null) ?? 'comfortable')
    setCitations(localStorage.getItem(CITATIONS_KEY) !== 'false')
    setNotifications(localStorage.getItem(NOTIFICATIONS_KEY) !== 'false')
  }, [])

  const initials = useMemo(() => (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase(), [user])
  const tokenPreview = accessToken ? `${accessToken.slice(0, 16)}...${accessToken.slice(-8)}` : 'No active token'

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setProfileSaving(true)
    try {
      await dispatch(updateProfile({
        full_name: fullName.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      })).unwrap()
      dispatch(addToast({ message: 'Profile updated', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Could not update profile', type: 'error' }))
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPassword || !newPassword) {
      dispatch(addToast({ message: 'Enter both password fields', type: 'error' }))
      return
    }
    setPasswordSaving(true)
    try {
      await dispatch(changePassword({ current_password: currentPassword, new_password: newPassword })).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      dispatch(addToast({ message: 'Password changed', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Could not change password', type: 'error' }))
    } finally {
      setPasswordSaving(false)
    }
  }

  const updateTheme = (value: ThemeChoice) => {
    setTheme(value)
    applyTheme(value)
  }

  const updateDensity = (value: DensityChoice) => {
    setDensity(value)
    localStorage.setItem(DENSITY_KEY, value)
  }

  const updateCitations = (value: boolean) => {
    setCitations(value)
    localStorage.setItem(CITATIONS_KEY, String(value))
  }

  const updateNotifications = (value: boolean) => {
    setNotifications(value)
    localStorage.setItem(NOTIFICATIONS_KEY, String(value))
  }

  const signOut = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label mb-2">Workspace</p>
          <h1 className="text-title">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage your profile, access, and how RAG Studio behaves while you work.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-muted-foreground">{accessToken ? 'Session active' : 'Signed out'}</span>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Surface className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Profile</h2>
                <p className="text-xs text-muted-foreground">Keep your account details recognizable across the workspace.</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 text-sm font-semibold text-primary ring-1 ring-primary/20">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.email ?? 'Account'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.role ?? 'Member'}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Full name</FieldLabel>
                  <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Job title</FieldLabel>
                  <TextInput value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Research lead" />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Avatar URL</FieldLabel>
                <TextInput value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={profileSaving || loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {profileSaving ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </form>
          </Surface>

          <Surface className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
                <p className="text-xs text-muted-foreground">Tune the interface for repeated daily use.</p>
              </div>
            </div>

            <div className="space-y-3">
              <SettingRow icon={Monitor} title="Theme" description="Choose a light, dark, or system-matched interface.">
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                  {[
                    { value: 'system', icon: Monitor, label: 'System' },
                    { value: 'light', icon: Sun, label: 'Light' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateTheme(value as ThemeChoice)}
                      className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
                        theme === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow icon={SlidersHorizontal} title="Density" description="Set spacing for panels, forms, and lists.">
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                  {(['comfortable', 'compact'] as DensityChoice[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateDensity(value)}
                      className={`h-8 rounded-md px-3 text-xs font-medium capitalize transition ${
                        density === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow icon={BadgeCheck} title="Citations" description="Prefer answers that show source passages by default.">
                <input
                  type="checkbox"
                  checked={citations}
                  onChange={(e) => updateCitations(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
                  aria-label="Enable citations"
                />
              </SettingRow>

              <SettingRow icon={Bell} title="Notifications" description="Show document and conversation updates in the top bar.">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => updateNotifications(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
                  aria-label="Enable notifications"
                />
              </SettingRow>
            </div>
          </Surface>
        </div>

        <div className="space-y-5">
          <Surface className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Runtime</h2>
                <p className="text-xs text-muted-foreground">Current local AI configuration.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  LLM
                </div>
                <p className="text-xs text-muted-foreground">Ollama</p>
                <p className="mt-1 text-sm font-medium text-foreground">qwen3:8b</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Database className="h-4 w-4 text-primary" />
                  Embeddings
                </div>
                <p className="text-xs text-muted-foreground">Ollama</p>
                <p className="mt-1 text-sm font-medium text-foreground">nomic-embed-text</p>
              </div>
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Security</h2>
                <p className="text-xs text-muted-foreground">Manage credentials for this account.</p>
              </div>
            </div>

            <form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-2">
                <FieldLabel>Current password</FieldLabel>
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>New password</FieldLabel>
                <div className="flex gap-2">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => setShowPassword((value) => !value)} className="w-10 px-0" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={passwordSaving} className="w-full gap-2">
                <KeyRound className="h-4 w-4" />
                {passwordSaving ? 'Updating...' : 'Change password'}
              </Button>
            </form>
          </Surface>

          <Surface className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Session</h2>
                <p className="text-xs text-muted-foreground">Token preview and sign-out controls.</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Access token</p>
              <p className="mt-1 break-all text-xs text-foreground">{tokenPreview}</p>
            </div>
            <Button type="button" variant="destructive" onClick={signOut} className="mt-4 w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </Surface>
        </div>
      </section>
    </PageShell>
  )
}

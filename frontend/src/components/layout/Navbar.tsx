import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { toggleSidebar } from '../../store/slices/uiSlice'
import { markAllNotificationsRead, markNotificationRead } from '../../store/slices/notificationsSlice'
import { logout } from '../../store/slices/authSlice'
import { Menu, Bell, Sun, Moon, CheckCheck, LogOut, Settings } from 'lucide-react'

export function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { accessToken, user } = useAppSelector((s) => s.auth)
  const { items: notifications, unreadCount, loading } = useAppSelector((s) => s.notifications)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) setTheme(stored)
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/55 bg-white/62 px-4 backdrop-blur-2xl transition-colors duration-300 dark:border-white/8 dark:bg-slate-950/45">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Toggle theme"
        >
          <span className="theme-icon-enter block" key={theme}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </span>
        </button>

        {accessToken && (
          <>
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen((o) => !o); setProfileOpen(false) }}
                className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className={`h-4 w-4 ${unreadCount ? 'text-primary' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="glass-panel absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-premium animate-rise">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                    </div>
                    <button
                      onClick={() => dispatch(markAllNotificationsRead())}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    {loading ? (
                      <div className="space-y-2 p-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No notifications yet
                      </div>
                    ) : notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!item.is_read) dispatch(markNotificationRead(item.id))
                          if (item.entity_type === 'chat_session' && item.entity_id) navigate(`/chat/${item.entity_id}`)
                          setNotificationsOpen(false)
                        }}
                        className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-accent"
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">{item.title}</span>
                          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.message}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen((o) => !o); setNotificationsOpen(false) }}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-xs font-semibold text-primary ring-1 ring-primary/20 transition hover:ring-primary/40"
                aria-label="Profile"
              >
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials}
              </button>

              {profileOpen && (
                <div className="glass-panel absolute right-0 mt-2 w-64 rounded-2xl p-2 shadow-premium animate-rise">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user?.full_name || 'Account'}</p>
                    {user?.job_title && <p className="truncate text-xs text-muted-foreground">{user.job_title}</p>}
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="mt-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-accent"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                  </Link>
                  <button
                    onClick={() => { dispatch(logout()); navigate('/login') }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/8"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

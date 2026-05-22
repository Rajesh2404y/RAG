import { NavLink, useNavigate } from 'react-router-dom'
import {
  BrainCircuit, FolderOpen, LayoutDashboard, MessageSquare,
  Search, Upload, ChevronLeft, ChevronRight, Settings, Command,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { toggleSidebar } from '../../store/slices/uiSlice'
import { useEffect, useMemo, useState } from 'react'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat',        icon: MessageSquare,   label: 'Chat' },
  { to: '/collections', icon: FolderOpen,      label: 'Collections' },
  { to: '/upload',      icon: Upload,          label: 'Upload' },
  { to: '/search',      icon: Search,          label: 'Search' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
]

export function Sidebar() {
  const open = useAppSelector((s) => s.ui.sidebarOpen)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')

  const commands = useMemo(() => [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   hint: 'Your day at a glance' },
    { to: '/collections', icon: FolderOpen,      label: 'Collections', hint: 'Group related files' },
    { to: '/chat',        icon: MessageSquare,   label: 'Chat',        hint: 'Ask your documents' },
    { to: '/search',      icon: Search,          label: 'Search',      hint: 'Find a passage' },
    { to: '/upload',      icon: Upload,          label: 'Upload',      hint: 'Add documents' },
    { to: '/settings',    icon: Settings,        label: 'Settings',    hint: 'Preferences' },
  ], [])

  const filteredCommands = useMemo(() => {
    const q = commandSearch.toLowerCase()
    return commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q))
  }, [commandSearch, commands])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      if (e.key === 'Escape') setShowCommandPalette(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const runCommand = (to: string) => {
    navigate(to)
    setCommandSearch('')
    setShowCommandPalette(false)
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col transition-all duration-300
          border-r border-white/55 bg-white/68 shadow-[18px_0_60px_hsl(228_40%_20%/0.09)] backdrop-blur-2xl
          dark:border-white/8 dark:bg-slate-950/50 dark:shadow-[18px_0_80px_hsl(0_0%_0%/0.30)]
          ${open ? 'w-72' : 'w-[72px]'}`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 text-white shadow-glow-sm">
              <BrainCircuit className="h-5 w-5" />
            </div>
            {open && (
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-sidebar-foreground">RAG Studio</span>
                <span className="block truncate text-[11px] text-muted-foreground">Documents, made useful</span>
              </div>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={!open ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive ? 'nav-active' : 'nav-item'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Command palette trigger */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setShowCommandPalette(true)}
            title="Command Palette (Ctrl+K)"
            className="nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
          >
            <Command className="h-4 w-4 shrink-0" />
            {open && (
              <span className="flex flex-1 items-center justify-between">
                Command
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl+K</kbd>
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Command Palette */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-[18vh] backdrop-blur-xl"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-2xl p-2 shadow-premium animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Command className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].to)
                }}
                placeholder="Search commands..."
                className="h-12 w-full rounded-xl border border-border bg-background/70 pl-10 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/12"
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No commands found</p>
              ) : filteredCommands.map(({ to, icon: Icon, label, hint }) => (
                <button
                  key={to}
                  onClick={() => runCommand(to)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Database, FolderOpen, MessageSquare, Sparkles, TrendingUp } from 'lucide-react'
import { useAppSelector } from '../store/hooks'
import { formatDate } from '../lib/utils'
import { PageShell, Surface } from '../components/ui/primitives'

export function DashboardPage() {
  const collections = useAppSelector((s) => s.collections.items)
  const sessions = useAppSelector((s) => s.chat.sessions)
  const notifications = useAppSelector((s) => s.notifications.items)

  const stats = useMemo(() => [
    {
      label: 'Spaces',
      value: collections.length,
      icon: FolderOpen,
      to: '/collections',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
      glow: 'from-indigo-500/8 to-transparent',
    },
    {
      label: 'Conversations',
      value: sessions.length,
      icon: MessageSquare,
      to: '/chat',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
      glow: 'from-violet-500/8 to-transparent',
    },
  ], [collections, sessions.length])

  const recentCollections = collections.slice(0, 4)
  const activity = notifications.slice(0, 5)

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-2">Overview</p>
          <h1 className="text-title">Dashboard</h1>
        </div>
        <Link
          to="/upload"
          className="btn-primary hidden sm:inline-flex"
        >
          <Sparkles className="h-4 w-4" /> New upload
        </Link>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ label, value, icon: Icon, to, color, bg, glow }) => (
          <Link key={label} to={to} className="stat-card rounded-2xl p-5 block">
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${glow} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:text-muted-foreground" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Recent spaces */}
        <Surface className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent spaces</h2>
              <p className="text-xs text-muted-foreground">Your latest document collections</p>
            </div>
            <Link
              to="/collections"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderOpen className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">No spaces yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a space to begin organising documents</p>
              <Link to="/collections" className="mt-4 btn-primary text-xs h-8 px-3">
                Create space
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {recentCollections.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/collections/${collection.id}`}
                  className="flex items-center gap-3 bg-background/40 p-3.5 transition hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{collection.name}</p>
                    <p className="text-xs text-muted-foreground">Updated {formatDate(collection.created_at)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </Link>
              ))}
            </div>
          )}
        </Surface>

        {/* Activity */}
        <Surface className="p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Activity</h2>
              <p className="text-xs text-muted-foreground">Recent events</p>
            </div>
          </div>

          <div className="space-y-2">
            {(activity.length
              ? activity
              : [{ id: 'empty', title: 'Ready when you are', message: 'Add a document to start asking questions.', created_at: '' }]
            ).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/60 bg-background/40 p-3.5 transition hover:bg-accent"
              >
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.message}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </PageShell>
  )
}

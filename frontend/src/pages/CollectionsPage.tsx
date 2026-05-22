import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button, PageShell, Surface } from '../components/ui/primitives'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { createCollection, deleteCollection, fetchCollections, type Collection } from '../store/slices/collectionsSlice'
import { addToast } from '../store/slices/uiSlice'
import { cn, formatDate } from '../lib/utils'

type ViewMode = 'grid' | 'list'

function LoadingState() {
  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-2xl border border-border bg-muted/50" />
        ))}
      </div>
    </PageShell>
  )
}

function EmptyState({
  search,
  onCreate,
}: {
  search: string
  onCreate: () => void
}) {
  return (
    <Surface className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FolderOpen className="h-7 w-7" />
      </div>
      <h2 className="text-base font-semibold text-foreground">
        {search ? 'No matching spaces' : 'Create your first space'}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {search
          ? 'Try a different search term or clear the filter to see every space.'
          : 'Spaces keep related documents, chats, and retrieval context grouped together.'}
      </p>
      {!search && (
        <Button onClick={onCreate} variant="primary" className="mt-5 gap-2">
          <Plus className="h-4 w-4" />
          New space
        </Button>
      )}
    </Surface>
  )
}

function CollectionIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
      <FileText className="h-5 w-5" />
    </div>
  )
}

export function CollectionsPage() {
  const dispatch = useAppDispatch()
  const { error, items, loading } = useAppSelector((s) => s.collections)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    dispatch(fetchCollections())
  }, [dispatch])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((collection) =>
      `${collection.name} ${collection.description ?? ''}`.toLowerCase().includes(query),
    )
  }, [items, search])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName) {
      dispatch(addToast({ message: 'Name your space first', type: 'error' }))
      return
    }

    setSaving(true)
    try {
      await dispatch(createCollection({
        name: trimmedName,
        description: trimmedDescription || undefined,
      })).unwrap()
      setName('')
      setDescription('')
      setCreating(false)
      dispatch(addToast({ message: 'Space created', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Could not create space', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await dispatch(deleteCollection(deleteTarget.id)).unwrap()
      dispatch(addToast({ message: 'Space deleted', type: 'success' }))
      setDeleteTarget(null)
    } catch {
      dispatch(addToast({ message: 'Could not delete space', type: 'error' }))
    } finally {
      setDeleting(false)
    }
  }

  if (loading && items.length === 0) return <LoadingState />

  return (
    <PageShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label mb-2">Library</p>
          <h1 className="text-title">Collections</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} space{items.length !== 1 ? 's' : ''} for organizing source documents and chats.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search spaces..."
              className="h-10 w-full rounded-lg border border-border bg-background/70 pl-9 pr-9 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-8 w-9 items-center justify-center rounded-md transition',
                viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex h-8 w-9 items-center justify-center rounded-md transition',
                viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={() => setCreating(true)} variant="primary" className="gap-2">
            <Plus className="h-4 w-4" />
            New space
          </Button>
        </div>
      </div>

      {error && (
        <Surface className="flex items-start gap-3 border-destructive/30 bg-destructive/8 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Collections could not be updated</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </Surface>
      )}

      {creating && (
        <Surface className="p-5">
          <form onSubmit={create} className="grid gap-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Research papers"
                className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Description</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional context for this space"
                className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" />
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false)
                  setName('')
                  setDescription('')
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Surface>
      )}

      {filtered.length === 0 ? (
        <EmptyState search={search} onCreate={() => setCreating(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((collection) => (
            <Link
              key={collection.id}
              to={`/collections/${collection.id}`}
              className="premium-card group flex min-h-44 flex-col rounded-2xl p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <CollectionIcon />
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setDeleteTarget(collection)
                  }}
                  className="rounded-lg p-2 text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Delete ${collection.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-foreground transition group-hover:text-primary">
                  {collection.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {collection.description || 'No description yet.'}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formatDate(collection.created_at)}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Surface className="overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((collection) => (
              <Link
                key={collection.id}
                to={`/collections/${collection.id}`}
                className="group flex items-center gap-3 bg-background/30 p-4 transition hover:bg-accent/70"
              >
                <CollectionIcon />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-foreground transition group-hover:text-primary">
                    {collection.name}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {collection.description || 'No description yet.'}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {formatDate(collection.created_at)}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setDeleteTarget(collection)
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${collection.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Link>
            ))}
          </div>
        </Surface>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-4 backdrop-blur-xl"
          onClick={() => setDeleteTarget(null)}
        >
          <Surface className="w-full max-w-md p-6 shadow-2xl animate-rise" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Delete space?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will remove "{deleteTarget.name}" and its documents from this workspace.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </PageShell>
  )
}

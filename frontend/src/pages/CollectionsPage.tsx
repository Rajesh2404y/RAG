import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Grid3X3, List, Search, Trash2, FileText, Calendar } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchCollections, createCollection, deleteCollection } from '../store/slices/collectionsSlice'
import { cn } from '../lib/utils'
import { formatDate } from '../lib/utils'

type ViewMode = 'grid' | 'list'

export function CollectionsPage() {
  const dispatch = useAppDispatch()
  const { items, loading } = useAppSelector((s) => s.collections)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { dispatch(fetchCollections()) }, [dispatch])

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return items.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query)
    )
  }, [items, search])

  const create = async () => {
    if (!name.trim()) return
    await dispatch(createCollection({ name }))
    setName('')
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title">Collections</h2>
          <p className="text-subtle">{items.length} space{items.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spaces..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 sm:w-64"
            />
          </div>
          
          <div className="flex rounded-lg border border-border p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded",
                viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={() => setCreating(true)} 
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      {creating && (
        <div className="flex gap-2 max-w-md">
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Collection name"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
          />
          <button 
            onClick={create} 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Create
          </button>
          <button 
            onClick={() => setCreating(false)} 
            className="px-4 py-2 rounded-lg border border-border text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {search ? 'No spaces found' : 'Create your first space'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Try a different search.' : 'Group a few related documents and start asking questions.'}
          </p>
          {!search && (
            <button 
              onClick={() => setCreating(true)} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Create space
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((col) => (
            <Link 
              key={col.id} 
              to={`/collections/${col.id}`} 
              className="group rounded-lg border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); dispatch(deleteCollection(col.id)) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {col.name}
              </h3>
              {col.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {col.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(col.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {filtered.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{col.name}</h3>
                  {col.description && (
                    <p className="text-sm text-muted-foreground">{col.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(col.created_at)}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); dispatch(deleteCollection(col.id)) }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

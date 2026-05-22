import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, FileText, Loader2, RefreshCw, Trash2, Wrench } from 'lucide-react'
import { useAppSelector } from '../store/hooks'
import { useAppDispatch } from '../store/hooks'
import { addToast } from '../store/slices/uiSlice'
import { DropZone } from '../components/upload/DropZone'
import { documentsApi } from '../services/documentsApi'
import { PageHeader, PageShell, Select, Surface } from '../components/ui/primitives'
import { cn } from '../lib/utils'

interface DocumentItem {
  id: string
  original_filename: string
  status: string
  processing_stage?: string | null
  error_message?: string | null
  file_size?: number | null
  created_at?: string
}

const STAGE_LABEL: Record<string, string> = {
  queued:                'Queued',
  starting:              'Starting',
  parsing_pdf:           'Parsing PDF',
  chunking:              'Chunking',
  generating_embeddings: 'Generating embeddings',
  vectorizing:           'Vectorizing',
  ready:                 'Ready',
  failed:                'Failed',
}

function stageLabel(doc: DocumentItem) {
  if (doc.status === 'processing' && doc.processing_stage)
    return STAGE_LABEL[doc.processing_stage] ?? doc.processing_stage.replace(/_/g, ' ')
  return doc.status.charAt(0).toUpperCase() + doc.status.slice(1)
}

function StatusBadge({ doc }: { doc: DocumentItem }) {
  const label = stageLabel(doc)
  if (doc.status === 'ready')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-3 w-3" /> {label}
      </span>
    )
  if (doc.status === 'failed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3 w-3" /> {label}
      </span>
    )
  if (doc.status === 'processing')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Loader2 className="h-3 w-3 animate-spin" /> {label}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Clock className="h-3 w-3" /> {label}
    </span>
  )
}

export function UploadPage() {
  const dispatch = useAppDispatch()
  const collections = useAppSelector((s) => s.collections.items)
  const [collectionId, setCollectionId] = useState('')
  const activeCollectionId = collectionId || collections[0]?.id || ''
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [recovering, setRecovering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDocuments = useCallback(async () => {
    if (!activeCollectionId) return
    try {
      setDocuments(await documentsApi.list(activeCollectionId))
    } catch {
      // silently ignore
    }
  }, [activeCollectionId])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const processStuckFiles = async () => {
    setRecovering(true)
    try {
      await documentsApi.recoverStuck()
      await loadDocuments()
      dispatch(addToast({ type: 'success', message: 'Stuck files requeued' }))
    } finally {
      setRecovering(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    await loadDocuments()
    setRefreshing(false)
  }

  const deleteDocument = async (doc: DocumentItem) => {
    setDeletingId(doc.id)
    try {
      await documentsApi.delete(doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      dispatch(addToast({ type: 'success', message: `${doc.original_filename} deleted` }))
    } catch {
      dispatch(addToast({ type: 'error', message: 'Delete failed — please try again' }))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageShell className="max-w-5xl">

      {/* ── Header card ── */}
      <Surface className="p-5">
        <PageHeader
          title="Upload"
          description="Add documents to the selected space."
          actions={collections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={processStuckFiles}
                disabled={recovering}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-2 text-sm transition hover:bg-accent hover:border-primary/25 disabled:opacity-50"
              >
                {recovering
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Wrench className="h-3.5 w-3.5" />}
                {recovering ? 'Processing…' : 'Process stuck files'}
              </button>
              <Select
                value={activeCollectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="min-w-[160px]"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}
        />
      </Surface>

      {/* ── Drop zone ── */}
      {activeCollectionId
        ? <DropZone collectionId={activeCollectionId} onSuccess={loadDocuments} />
        : (
          <Surface className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No space selected</p>
            <p className="text-xs text-muted-foreground">Create a collection first, then come back to upload.</p>
          </Surface>
        )
      }

      {/* ── Files in this space ── */}
      {documents.length > 0 && (
        <Surface className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Files in this space</h3>
              <p className="text-xs text-muted-foreground">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  'flex items-center gap-3 bg-background/40 px-4 py-3 transition hover:bg-accent',
                  deletingId === doc.id && 'opacity-50 pointer-events-none',
                )}
              >
                {/* File icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.original_filename}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {doc.file_size && (
                      <span className="text-xs text-muted-foreground">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                    {doc.status === 'failed' && doc.error_message && (
                      <span className="truncate text-xs text-destructive">{doc.error_message}</span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <StatusBadge doc={doc} />

                {/* Delete */}
                <button
                  onClick={() => deleteDocument(doc)}
                  disabled={deletingId === doc.id}
                  className="ml-1 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  title="Delete document"
                >
                  {deletingId === doc.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </PageShell>
  )
}

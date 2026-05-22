import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, CheckCircle, Loader2, RotateCcw, Trash2, UploadCloud } from 'lucide-react'
import { cn } from '../../lib/utils'
import { documentsApi } from '../../services/documentsApi'
import { useAppDispatch } from '../../store/hooks'
import { addToast } from '../../store/slices/uiSlice'

interface Props { collectionId: string; onSuccess?: () => void }

type IngestStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'

interface FileState {
  file: File
  progress: number
  status: IngestStatus
  documentId?: string
  stageLabel?: string
  error?: string
}

const STATUS_LABEL: Record<IngestStatus, string> = {
  pending:    'Queued',
  uploading:  'Uploading',
  processing: 'Processing',
  ready:      'Ready',
  failed:     'Failed',
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

const POLL_INTERVAL_MS  = 3000
const POLL_MAX_ATTEMPTS = 60

const statusColor: Record<IngestStatus, string> = {
  pending:    'text-muted-foreground',
  uploading:  'text-primary',
  processing: 'text-amber-600 dark:text-amber-400',
  ready:      'text-emerald-600 dark:text-emerald-400',
  failed:     'text-destructive',
}

const statusBg: Record<IngestStatus, string> = {
  pending:    'bg-muted/60',
  uploading:  'bg-primary/10',
  processing: 'bg-amber-500/10',
  ready:      'bg-emerald-500/10',
  failed:     'bg-destructive/10',
}

export function DropZone({ collectionId, onSuccess }: Props) {
  const dispatch = useAppDispatch()
  const [files, setFiles] = useState<FileState[]>([])
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, progress: 0, status: 'pending' as const })),
    ])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    noClick: false,
  })

  // ── Poll a single document until ready / failed ──────────────────────────
  const startPolling = useCallback((documentId: string, fileIndex: number) => {
    let attempts = 0
    const timer = setInterval(async () => {
      attempts++
      try {
        const doc = await documentsApi.status(documentId)
        const s: IngestStatus =
          doc.status === 'ready'  ? 'ready'  :
          doc.status === 'failed' ? 'failed' : 'processing'

        const stage = STAGE_LABEL[doc.processing_stage] ?? doc.processing_stage ?? undefined

        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: s, stageLabel: stage, error: doc.error_message ?? undefined }
              : f
          )
        )

        if (s === 'ready') {
          clearInterval(timer)
          delete pollTimers.current[documentId]
          dispatch(addToast({ type: 'success', message: `${doc.original_filename} is ready` }))
          onSuccess?.()
        } else if (s === 'failed') {
          clearInterval(timer)
          delete pollTimers.current[documentId]
          dispatch(addToast({ type: 'error', message: `${doc.original_filename} failed` }))
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          clearInterval(timer)
          delete pollTimers.current[documentId]
          setFiles((prev) =>
            prev.map((f, i) =>
              i === fileIndex ? { ...f, status: 'failed', error: 'Timed out waiting for processing' } : f
            )
          )
        }
      } catch {
        // network blip — keep polling
      }
    }, POLL_INTERVAL_MS)

    pollTimers.current[documentId] = timer
  }, [dispatch, onSuccess])

  // ── Upload all pending files ──────────────────────────────────────────────
  const upload = async () => {
    const pendingEntries = files.map((f, i) => ({ f, i })).filter(({ f }) => f.status === 'pending')
    if (!pendingEntries.length) return

    setFiles((prev) => prev.map((f) => f.status === 'pending' ? { ...f, status: 'uploading' } : f))

    try {
      const result = await documentsApi.upload(
        collectionId,
        pendingEntries.map(({ f }) => f.file),
        (pct) => setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, progress: pct } : f)),
      )

      const docs: any[] = result.documents ?? []
      pendingEntries.forEach(({ i }, idx) => {
        const doc = docs[idx]
        if (doc?.id) {
          setFiles((prev) =>
            prev.map((f, fi) =>
              fi === i ? { ...f, status: 'processing', documentId: doc.id, progress: 100 } : f
            )
          )
          startPolling(doc.id, i)
        }
      })
    } catch (e: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'failed', error: e?.response?.data?.detail ?? String(e) }
            : f
        )
      )
      dispatch(addToast({ type: 'error', message: 'Upload failed — check file and try again' }))
    }
  }

  // ── Remove / retry ────────────────────────────────────────────────────────
  const remove = (idx: number) => {
    const doc = files[idx]
    if (doc.documentId && pollTimers.current[doc.documentId]) {
      clearInterval(pollTimers.current[doc.documentId])
      delete pollTimers.current[doc.documentId]
    }
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const retry = (idx: number) =>
    setFiles((prev) =>
      prev.map((f, i) => i === idx ? { ...f, status: 'pending', error: undefined, stageLabel: undefined, progress: 0 } : f)
    )

  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <div className="space-y-4">

      {/* ── Drop zone ── */}
      <div
        {...getRootProps()}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200',
          isDragActive
            ? 'border-primary bg-primary/5 shadow-glow-sm'
            : 'border-border bg-card/60 hover:border-primary/50 hover:bg-accent/40 hover:shadow-soft',
        )}
      >
        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 grid-glow opacity-40" />

        {/* Hide the native "No file chosen" text — input is visually hidden */}
        <input {...getInputProps()} className="sr-only" />

        <div className="relative flex flex-col items-center gap-4">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200',
            isDragActive
              ? 'bg-primary text-primary-foreground shadow-glow scale-110'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:scale-105',
          )}>
            <UploadCloud className="h-8 w-8" />
          </div>

          <div>
            <p className="text-base font-semibold text-foreground">
              {isDragActive ? 'Drop PDFs here' : 'Drag in PDFs or click to browse'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Files are chunked, embedded, and indexed automatically.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['PDF only', 'Max 50 MB', 'Multiple files supported'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3.5 transition-all',
                f.status === 'ready'   && 'border-emerald-500/25 bg-emerald-500/5',
                f.status === 'failed'  && 'border-destructive/25 bg-destructive/5',
                f.status === 'processing' && 'border-amber-500/25 bg-amber-500/5',
                (f.status === 'pending' || f.status === 'uploading') && 'border-border bg-card/70',
              )}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {f.status === 'ready'      && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                {f.status === 'failed'     && <AlertCircle className="h-5 w-5 text-destructive" />}
                {(f.status === 'uploading' || f.status === 'processing') && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {f.status === 'pending' && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border" />
                )}
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{f.file.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(f.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    statusBg[f.status],
                    statusColor[f.status],
                  )}>
                    {f.status === 'processing' && f.stageLabel
                      ? f.stageLabel
                      : STATUS_LABEL[f.status]}
                  </span>
                  {f.status === 'failed' && f.error && (
                    <span className="truncate text-xs text-destructive">{f.error}</span>
                  )}
                </div>
              </div>

              {/* Upload progress */}
              {f.status === 'uploading' && (
                <div className="w-28 shrink-0">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-right text-xs text-muted-foreground">{f.progress}%</p>
                </div>
              )}

              {/* Processing pulse bar */}
              {f.status === 'processing' && (
                <div className="w-20 shrink-0">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {f.status === 'failed' && (
                  <button
                    onClick={() => retry(i)}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary"
                    title="Retry"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {(f.status === 'pending' || f.status === 'ready' || f.status === 'failed') && (
                  <button
                    onClick={() => remove(i)}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {pendingCount > 0 && (
            <button
              onClick={upload}
              className="btn-primary w-full rounded-xl"
            >
              <UploadCloud className="h-4 w-4" />
              Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

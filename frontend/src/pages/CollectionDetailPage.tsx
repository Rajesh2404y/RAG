import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DropZone } from '../components/upload/DropZone'
import { documentsApi } from '../services/documentsApi'

interface DocumentItem {
  id: string
  original_filename: string
  file_size: number | null
  page_count: number | null
  status: string
  processing_stage?: string | null
  error_message?: string | null
  created_at: string
}

const stageLabel = (doc: DocumentItem) =>
  doc.status === 'processing' && doc.processing_stage
    ? doc.processing_stage.replace(/_/g, ' ')
    : doc.status

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [documents, setDocuments] = useState<DocumentItem[]>([])

  const loadDocuments = async () => {
    if (!id) return
    setDocuments(await documentsApi.list(id))
  }

  useEffect(() => { loadDocuments() }, [id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Space</h1>
        <p className="text-sm text-muted-foreground">Add files and ask questions from one place.</p>
      </div>
      {id && <DropZone collectionId={id} onSuccess={loadDocuments} />}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Files</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span className="truncate">{doc.original_filename}</span>
            <span className="capitalize text-muted-foreground">{stageLabel(doc)}{doc.page_count ? ` - ${doc.page_count} pages` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

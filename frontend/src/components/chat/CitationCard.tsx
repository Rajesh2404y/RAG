import { FileText, Target } from 'lucide-react'
import { memo } from 'react'

interface Citation {
  filename: string
  page_number: number | null
  excerpt: string
  score: number
  relevance_score?: number
  section_title?: string
}

function CitationCardComponent({ citation }: { citation: Citation }) {
  const score = Math.round((citation.relevance_score ?? citation.score) * 100)

  return (
    <div className="citation-card flex items-start gap-3 rounded-xl p-3 text-xs">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-foreground">{citation.filename}</p>
          {citation.page_number && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              p.{citation.page_number}
            </span>
          )}
        </div>
        {citation.section_title && (
          <p className="mt-1 truncate text-primary/80">{citation.section_title}</p>
        )}
        {citation.excerpt && (
          <p className="mt-1 line-clamp-2 text-muted-foreground">{citation.excerpt}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
            <Target className="h-3 w-3" />
            {score}% match
          </span>
        </div>
      </div>
    </div>
  )
}

export const CitationCard = memo(CitationCardComponent)

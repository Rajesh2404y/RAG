import { useCallback, useState } from 'react'
import { Search } from 'lucide-react'
import { searchApi } from '../../services/chatApi'
import { Button } from '../ui/primitives'

interface Props { collectionId?: string }
interface Result { chunk_id: string; filename: string; page_number: number | null; content: string; score: number }

export function SearchBar({ collectionId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchApi.search({ collection_id: collectionId || undefined, query })
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [collectionId, query])

  return (
    <div className="space-y-4">
      <div className="glass-panel flex gap-2 rounded-lg p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search a phrase, policy, or idea..."
            className="h-10 w-full rounded-lg border border-border bg-background/80 pl-9 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <Button onClick={search} disabled={loading} variant="primary">
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      <div className="space-y-3">
        {results.map((result) => (
          <div key={result.chunk_id} className="glass-panel space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">
                {result.filename}{result.page_number ? ` - p.${result.page_number}` : ''}
              </span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                {result.score.toFixed(3)}
              </span>
            </div>
            <p className="line-clamp-3 text-sm text-muted-foreground">{result.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

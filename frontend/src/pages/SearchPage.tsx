import { useState } from 'react'
import { useAppSelector } from '../store/hooks'
import { SearchBar } from '../components/search/SearchBar'
import { PageHeader, PageShell, Select, Surface } from '../components/ui/primitives'

export function SearchPage() {
  const collections = useAppSelector((s) => s.collections.items)
  const [collectionId, setCollectionId] = useState('')

  return (
    <PageShell className="max-w-5xl">
      <Surface className="p-5">
        <PageHeader
          title="Search"
          description="Find the exact passage you need."
          actions={
            <Select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">All spaces</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>{collection.name}</option>
              ))}
            </Select>
          }
        />
      </Surface>
      {collections.length ? <SearchBar collectionId={collectionId} /> : (
        <p className="text-muted-foreground text-sm">Add a document to start searching.</p>
      )}
    </PageShell>
  )
}

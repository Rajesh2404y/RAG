import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Edit3, FolderOpen, MessageSquare, Plus, Save, Trash2, X } from 'lucide-react'
import { ChatWindow } from '../components/chat/ChatWindow'
import { Button, PageShell, Select, Surface } from '../components/ui/primitives'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  clearChat,
  deleteChatSession,
  fetchChatSessions,
  loadChatSession,
  renameChatSession,
  type ChatSession,
} from '../store/slices/chatSlice'
import { addToast } from '../store/slices/uiSlice'
import { formatDate } from '../lib/utils'

function sessionTitle(session: ChatSession) {
  return session.title || session.messages?.find((message) => message.role === 'user')?.content || 'Untitled chat'
}

export function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const collections = useAppSelector((s) => s.collections.items)
  const { error, messages, sessionId: activeSessionId, sessionLoading, sessions, sessionsLoading, streaming } = useAppSelector((s) => s.chat)
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (sessions.length === 0) dispatch(fetchChatSessions())
  }, [dispatch, sessions.length])

  useEffect(() => {
    if (sessionId) dispatch(loadChatSession(sessionId))
    else dispatch(clearChat())
  }, [dispatch, sessionId])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId || session.id === sessionId),
    [activeSessionId, sessionId, sessions],
  )

  useEffect(() => {
    const nextCollectionId = activeSession?.collection_id || collections[0]?.id || ''
    setSelectedCollectionId((current) => {
      if (activeSession?.collection_id) return activeSession.collection_id
      if (current && collections.some((collection) => collection.id === current)) return current
      return nextCollectionId
    })
  }, [activeSession?.collection_id, collections])

  const activeCollection = collections.find((collection) => collection.id === selectedCollectionId)

  const newChat = () => {
    dispatch(clearChat())
    navigate('/chat')
  }

  const startRename = (session: ChatSession) => {
    setRenamingId(session.id)
    setTitle(sessionTitle(session))
  }

  const saveRename = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!renamingId) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      dispatch(addToast({ type: 'error', message: 'Chat title cannot be empty' }))
      return
    }
    try {
      await dispatch(renameChatSession({ id: renamingId, title: trimmedTitle })).unwrap()
      dispatch(addToast({ type: 'success', message: 'Chat renamed' }))
      setRenamingId(null)
      setTitle('')
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not rename chat' }))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await dispatch(deleteChatSession(deleteTarget.id)).unwrap()
      dispatch(addToast({ type: 'success', message: 'Chat deleted' }))
      if (activeSessionId === deleteTarget.id || sessionId === deleteTarget.id) navigate('/chat')
      setDeleteTarget(null)
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not delete chat' }))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageShell className="max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label mb-2">Ask</p>
          <h1 className="text-title">Chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask questions, compare details, and trace answers back to your source documents.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={selectedCollectionId}
            onChange={(event) => setSelectedCollectionId(event.target.value)}
            disabled={Boolean(activeSession?.collection_id) || streaming || collections.length === 0}
            className="h-10 min-w-64"
            aria-label="Select collection for chat"
          >
            {collections.length === 0 ? (
              <option value="">No spaces yet</option>
            ) : collections.map((collection) => (
              <option key={collection.id} value={collection.id}>{collection.name}</option>
            ))}
          </Select>
          <Button onClick={newChat} variant="primary" className="gap-2">
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </div>

      {error && (
        <Surface className="flex items-start gap-3 border-destructive/30 bg-destructive/8 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Chat needs attention</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </Surface>
      )}

      {collections.length === 0 ? (
        <Surface className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Create a space first</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Chat works against one collection at a time so answers can stay grounded in the right files.
          </p>
          <Link to="/collections" className="btn-primary mt-5">
            <Plus className="h-4 w-4" />
            Create space
          </Link>
        </Surface>
      ) : (
        <Surface className="flex h-[calc(100vh-13rem)] min-h-[36rem] overflow-hidden">
          <aside className="hidden w-80 shrink-0 border-r border-border bg-background/40 md:flex md:flex-col">
            <div className="border-b border-border p-3">
              <Button onClick={newChat} variant="primary" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                New chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {sessionsLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8" />
                  Start a conversation with your documents.
                </div>
              ) : sessions.map((session) => {
                const isActive = activeSessionId === session.id || sessionId === session.id
                const collection = collections.find((item) => item.id === session.collection_id)

                return (
                  <div key={session.id} className={`group rounded-xl ${isActive ? 'bg-accent shadow-sm' : 'hover:bg-accent/60'}`}>
                    {renamingId === session.id ? (
                      <form onSubmit={saveRename} className="p-2">
                        <input
                          autoFocus
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setRenamingId(null)
                              setTitle('')
                            }
                          }}
                          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="mt-2 flex justify-end gap-1">
                          <button type="button" onClick={() => setRenamingId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-background" aria-label="Cancel rename">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button type="submit" className="rounded-lg p-1.5 text-primary hover:bg-background" aria-label="Save rename">
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => navigate(`/chat/${session.id}`)} className="w-full px-3 py-3 text-left">
                          <p className="truncate text-sm font-medium text-foreground">{sessionTitle(session)}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {collection?.name ?? 'Space'} - {formatDate(session.created_at)}
                          </p>
                        </button>
                        <div className="flex justify-end gap-1 px-2 pb-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button onClick={() => startRename(session)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-background" aria-label={`Rename ${sessionTitle(session)}`}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(session)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${sessionTitle(session)}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-background/45 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {activeSession ? sessionTitle(activeSession) : 'New chat'}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeCollection ? `Using ${activeCollection.name}` : 'Choose a space to begin'}
                </p>
              </div>
              <Select
                value={sessionId ?? ''}
                onChange={(event) => event.target.value ? navigate(`/chat/${event.target.value}`) : newChat()}
                className="h-9 max-w-40 md:hidden"
                aria-label="Select chat session"
              >
                <option value="">New chat</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{sessionTitle(session)}</option>
                ))}
              </Select>
            </div>

            {sessionLoading ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="h-24 w-full max-w-xl animate-pulse rounded-2xl bg-muted" />
              </div>
            ) : selectedCollectionId ? (
              <div className="min-h-0 flex-1">
                <ChatWindow collectionId={selectedCollectionId} />
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Choose a space to begin.</div>
            )}
          </section>
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
                <h2 className="text-base font-semibold text-foreground">Delete chat?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will remove "{sessionTitle(deleteTarget)}" from your chat history.
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

      {messages.length > 0 && !activeSession && (
        <p className="text-center text-xs text-muted-foreground">
          This new conversation will appear in history after the first answer is saved.
        </p>
      )}
    </PageShell>
  )
}

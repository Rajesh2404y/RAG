import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit3, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { clearChat, deleteChatSession, fetchChatSessions, loadChatSession, renameChatSession } from '../store/slices/chatSlice'
import { formatDate } from '../lib/utils'

export function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const collections = useAppSelector((s) => s.collections.items)
  const { sessions, sessionsLoading, sessionId: activeSessionId } = useAppSelector((s) => s.chat)
  const defaultCollection = collections[0]?.id ?? ''
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (sessions.length === 0) dispatch(fetchChatSessions())
  }, [dispatch, sessions.length])

  useEffect(() => {
    if (sessionId) dispatch(loadChatSession(sessionId))
  }, [dispatch, sessionId])

  const newChat = () => {
    dispatch(clearChat())
    navigate('/chat')
  }

  return (
    <div className="glass-panel flex h-[calc(100vh-7rem)] overflow-hidden rounded-lg">
      <aside className="hidden w-80 shrink-0 border-r border-border bg-background/45 backdrop-blur md:flex md:flex-col">
        <div className="border-b border-border p-3">
          <button onClick={newChat} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessionsLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-3 h-8 w-8" />
              Start a conversation with your documents.
            </div>
          ) : sessions.map((session) => (
            <div key={session.id} className={`group rounded-lg ${activeSessionId === session.id ? 'bg-accent shadow-sm' : 'hover:bg-accent/60'}`}>
              <button onClick={() => navigate(`/chat/${session.id}`)} className="w-full px-3 py-2 text-left">
                {renamingId === session.id ? (
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        dispatch(renameChatSession({ id: session.id, title }))
                        setRenamingId(null)
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-background px-2 py-1 text-sm"
                  />
                ) : (
                  <>
                    <p className="truncate text-sm font-medium">{session.title || session.messages?.[0]?.content || 'Untitled chat'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(session.created_at)}</p>
                  </>
                )}
              </button>
              <div className="flex justify-end gap-1 px-2 pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => { setRenamingId(session.id); setTitle(session.title || '') }} className="rounded-lg p-1 text-muted-foreground hover:bg-background">
                  <Edit3 className="h-3 w-3" />
                </button>
                <button onClick={() => dispatch(deleteChatSession(session.id))} className="rounded-lg p-1 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-background/45 px-4 py-3 backdrop-blur">
          <div>
            <h2 className="text-sm font-semibold">Chat</h2>
            <p className="text-xs text-muted-foreground">{defaultCollection ? 'Ask, compare, and trace answers back to sources.' : 'Create a space first.'}</p>
          </div>
          <button onClick={newChat} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent md:hidden">New</button>
        </div>
        {defaultCollection ? (
          <div className="min-h-0 flex-1">
            <ChatWindow collectionId={defaultCollection} />
          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Create a space and add a document to begin.</div>
        )}
      </section>
    </div>
  )
}

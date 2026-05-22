import { useRef, useEffect, useMemo } from 'react'
import { Bot, FileSearch, MessageSquare, Search, Sparkles } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useAppSelector } from '../../store/hooks'

interface Props { collectionId: string }

const PROMPTS = [
  { label: 'Summarize key points', icon: Sparkles },
  { label: 'Find sources',         icon: FileSearch },
  { label: 'Compare sections',     icon: MessageSquare },
]

export function ChatWindow({ collectionId }: Props) {
  const messages = useAppSelector((s) => s.chat.messages)
  const streaming = useAppSelector((s) => s.chat.streaming)
  const retrievalStage = useAppSelector((s) => s.chat.retrievalStage)
  const retrievalSources = useAppSelector((s) => s.chat.retrievalSources)
  const bottomRef = useRef<HTMLDivElement>(null)
  const visibleMessages = useMemo(() => messages.slice(-80), [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* Empty state */}
        {messages.length === 0 && !streaming && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-primary ring-1 ring-primary/15">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="text-title mb-2">Ask your documents anything</h3>
            <p className="text-subtle max-w-md">
              Every answer comes with sources so you can verify what matters.
            </p>
            <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-3">
              {PROMPTS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="premium-card rounded-xl p-4 text-left text-sm font-medium"
                >
                  <Icon className="mb-2.5 h-4 w-4 text-primary" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > visibleMessages.length && (
          <div className="text-center text-xs text-muted-foreground">
            Showing latest {visibleMessages.length} messages
          </div>
        )}

        {visibleMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {streaming && (
          <div className="flex items-start gap-3 animate-rise">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-primary ring-1 ring-primary/15">
              <Search className="h-4 w-4 animate-pulse" />
            </div>
            <div className="chat-bubble-ai w-full max-w-xl rounded-2xl rounded-tl-sm p-4">
              <p className="text-sm font-medium text-foreground">
                {retrievalStage?.label ?? 'Searching your documents'}
              </p>
              <p className="text-xs text-muted-foreground">
                {retrievalStage?.detail ?? 'Looking for the most useful passages'}
              </p>

              {/* Stage progress */}
              <div className="mt-3 flex gap-1">
                {['searching', 'analyzing', 'ranking', 'generating'].map((stage) => (
                  <div
                    key={stage}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      stage === retrievalStage?.stage
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {retrievalSources.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {retrievalSources.slice(0, 3).map((source: any, i: number) => (
                    <div
                      key={`${source.document_id}-${source.page_number}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs"
                    >
                      <FileSearch className="h-3.5 w-3.5 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {source.filename} - p.{source.page_number ?? '-'}
                      </span>
                      <span className="text-primary">
                        {Math.round((source.relevance_score ?? source.score ?? 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput collectionId={collectionId} />
    </div>
  )
}

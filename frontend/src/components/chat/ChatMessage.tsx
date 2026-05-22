import { CitationCard } from './CitationCard'
import { Bot, Check, Copy, RotateCcw, User } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: any[]
  created_at: string
}

function ChatMessageComponent({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const sentAt = useMemo(() => {
    if (!message.created_at) return ''
    const d = new Date(message.created_at)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [message.created_at])

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-primary ring-1 ring-primary/15">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={`group relative max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? 'chat-bubble-user rounded-br-sm'
              : 'chat-bubble-ai rounded-tl-sm text-foreground'
          }`}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

          {!isUser && (
            <div className="mt-2.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={copyToClipboard}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent" title="Retry">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {sentAt && <span className="ml-auto text-xs text-muted-foreground">{sentAt}</span>}
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="w-full space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground">Sources</p>
            {message.sources.map((s, i) => (
              <CitationCard key={i} citation={s} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground ring-1 ring-border">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent)

import { useState, KeyboardEvent, useRef, useEffect, useCallback } from 'react'
import { Loader2, Paperclip, Send, Sparkles } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  addMessage, appendStreamChunk, finalizeAssistant, replaceMessage,
  setRetrievalSources, setRetrievalStage, setStreaming, setSession,
  fetchChatSessions,
} from '../../store/slices/chatSlice'
import { fetchNotifications } from '../../store/slices/notificationsSlice'
import { addToast } from '../../store/slices/uiSlice'

interface Props { collectionId: string }

export function ChatInput({ collectionId }: Props) {
  const [value, setValue] = useState('')
  const dispatch = useAppDispatch()
  const sessionId = useAppSelector((s) => s.chat.sessionId)
  const streaming = useAppSelector((s) => s.chat.streaming)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const send = useCallback(async () => {
    if (!value.trim() || streaming) return
    const content = value.trim()
    const userTempId = `pending-user-${crypto.randomUUID()}`
    const assistantTempId = `pending-assistant-${crypto.randomUUID()}`
    setValue('')
    dispatch(setRetrievalSources([]))
    dispatch(setRetrievalStage({ stage: 'queued', label: 'Getting ready', detail: 'Reading your question' }))
    dispatch(addMessage({ id: userTempId, role: 'user', content, created_at: '' }))
    dispatch(setStreaming(true))
    dispatch(addMessage({ id: assistantTempId, role: 'assistant', content: '', created_at: '' }))

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/v1/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collection_id: collectionId, message: content, session_id: sessionId, stream: true }),
      })
      if (!res.ok || !res.body) throw new Error('Chat request failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.replace('data: ', '')
          if (payload === '[DONE]') break
          try {
            const event = JSON.parse(payload)
            const { chunk: text, session_id, message, retrieval_stage, retrieval, error } = event
            if (session_id) dispatch(setSession(session_id))
            if (retrieval_stage) dispatch(setRetrievalStage(retrieval_stage))
            if (retrieval?.sources) dispatch(setRetrievalSources(retrieval.sources))
            if (error) {
              dispatch(finalizeAssistant({ content: error }))
              dispatch(addToast({ type: 'error', message: error }))
              continue
            }
            if (text) dispatch(appendStreamChunk(text))
            if (message?.role === 'user') dispatch(replaceMessage({ tempId: userTempId, message }))
            if (message?.role === 'assistant') {
              dispatch(finalizeAssistant(message))
              if (message.sources) dispatch(setRetrievalSources(message.sources))
            }
          } catch {}
        }
      }
      dispatch(fetchChatSessions())
      dispatch(fetchNotifications())
      dispatch(addToast({ type: 'success', message: 'Answer ready' }))
    } catch {
      dispatch(finalizeAssistant({ content: 'Chat request failed. Please retry.' }))
      dispatch(addToast({ type: 'error', message: 'Chat request failed. Please retry.' }))
    } finally {
      dispatch(setStreaming(false))
      textareaRef.current?.focus()
    }
  }, [collectionId, dispatch, sessionId, streaming, value])

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  useEffect(() => { textareaRef.current?.focus() }, [])

  return (
    <div className="border-t border-border/60 bg-background/70 px-4 py-4 backdrop-blur-xl">
      <div className="relative mx-auto max-w-4xl">
        {/* Glow ring on focus */}
        <div className="relative rounded-2xl shadow-soft ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-primary/25 focus-within:shadow-glow-sm">
          <Sparkles className="absolute left-4 top-4 h-4 w-4 text-primary/70" />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your documents..."
            rows={2}
            disabled={streaming}
            className="w-full resize-none rounded-2xl border-0 bg-card/90 py-4 pl-11 pr-24 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            className="absolute bottom-3 right-14 rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={send}
            disabled={!value.trim() || streaming}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-40 disabled:shadow-none"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-muted-foreground/60">
        Always verify important details against the cited sources.
      </p>
    </div>
  )
}

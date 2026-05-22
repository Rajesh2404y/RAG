import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { chatApi } from '../../services/chatApi'

interface Message { id: string; role: 'user' | 'assistant'; content: string; sources?: any[]; created_at: string }
interface ChatSession { id: string; title: string | null; collection_id: string | null; created_at: string; messages?: Message[] }
interface ChatState {
  sessionId: string | null
  messages: Message[]
  sessions: ChatSession[]
  sessionsLoading: boolean
  streaming: boolean
  retrievalStage: { stage: string; label: string; detail?: string } | null
  retrievalSources: any[]
  error: string | null
}

const savedSessionId = localStorage.getItem('active_chat_session_id')
const initialState: ChatState = {
  sessionId: savedSessionId,
  messages: [],
  sessions: [],
  sessionsLoading: false,
  streaming: false,
  retrievalStage: null,
  retrievalSources: [],
  error: null,
}

export const fetchChatSessions = createAsyncThunk('chat/fetchSessions', chatApi.listSessions)
export const loadChatSession = createAsyncThunk('chat/loadSession', chatApi.getSession)
export const renameChatSession = createAsyncThunk('chat/renameSession', async ({ id, title }: { id: string; title: string }) => chatApi.renameSession(id, title))
export const deleteChatSession = createAsyncThunk('chat/deleteSession', chatApi.deleteSession)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<string>) {
      state.sessionId = action.payload
      localStorage.setItem('active_chat_session_id', action.payload)
    },
    setMessages(state, action: PayloadAction<Message[]>) { state.messages = action.payload },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload },
    addMessage(state, action: PayloadAction<Message>) { state.messages.push(action.payload) },
    replaceMessage(state, action: PayloadAction<{ tempId: string; message: Message }>) {
      const index = state.messages.findIndex((msg) => msg.id === action.payload.tempId)
      if (index >= 0) state.messages[index] = action.payload.message
      else if (!state.messages.some((msg) => msg.id === action.payload.message.id)) state.messages.push(action.payload.message)
    },
    finalizeAssistant(state, action: PayloadAction<Partial<Message>>) {
      const last = [...state.messages].reverse().find((msg) => msg.role === 'assistant')
      if (last) Object.assign(last, action.payload)
    },
    appendStreamChunk(state, action: PayloadAction<string>) {
      const last = state.messages[state.messages.length - 1]
      if (last?.role === 'assistant') last.content += action.payload
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.streaming = action.payload
      if (!action.payload) state.retrievalStage = null
    },
    setRetrievalStage(state, action: PayloadAction<{ stage: string; label: string; detail?: string } | null>) {
      state.retrievalStage = action.payload
    },
    setRetrievalSources(state, action: PayloadAction<any[]>) {
      state.retrievalSources = action.payload
    },
    clearChat(state) {
      state.messages = []
      state.sessionId = null
      state.retrievalStage = null
      state.retrievalSources = []
      localStorage.removeItem('active_chat_session_id')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatSessions.pending, (state) => { state.sessionsLoading = true })
      .addCase(fetchChatSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false
        state.sessions = action.payload
      })
      .addCase(fetchChatSessions.rejected, (state) => { state.sessionsLoading = false })
      .addCase(loadChatSession.fulfilled, (state, action) => {
        state.sessionId = action.payload.id
        state.messages = action.payload.messages ?? []
        localStorage.setItem('active_chat_session_id', action.payload.id)
      })
      .addCase(renameChatSession.fulfilled, (state, action) => {
        const session = state.sessions.find((item) => item.id === action.payload.id)
        if (session) session.title = action.payload.title
      })
      .addCase(deleteChatSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((item) => item.id !== action.meta.arg)
        if (state.sessionId === action.meta.arg) {
          state.sessionId = null
          state.messages = []
          localStorage.removeItem('active_chat_session_id')
        }
      })
  },
})

export const {
  setSession,
  setMessages,
  setError,
  addMessage,
  replaceMessage,
  finalizeAssistant,
  appendStreamChunk,
  setStreaming,
  setRetrievalStage,
  setRetrievalSources,
  clearChat,
} = chatSlice.actions
export default chatSlice.reducer

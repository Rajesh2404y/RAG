import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  entity_type?: string
  entity_id?: string
  created_at: string
}

interface NotificationsState {
  items: Notification[]
  unreadCount: number
  loading: boolean
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload
      state.unreadCount = action.payload.filter((n) => !n.is_read).length
      state.loading = false
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const n = state.items.find((i) => i.id === action.payload)
      if (n && !n.is_read) {
        n.is_read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllNotificationsRead(state) {
      state.items.forEach((n) => { n.is_read = true })
      state.unreadCount = 0
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const {
  setNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setLoading,
} = notificationsSlice.actions

// No-op thunk — replace with real API call when backend notification endpoint is ready
export const fetchNotifications = () => async () => {}

export default notificationsSlice.reducer

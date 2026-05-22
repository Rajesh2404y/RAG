import api from './apiClient'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  entity_type?: string | null
  entity_id?: string | null
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  list: async () => {
    const { data } = await api.get('/notifications/')
    return data as { items: NotificationItem[]; unread_count: number }
  },
  markRead: async (id: string) => {
    await api.post(`/notifications/${id}/read`)
    return id
  },
  markAllRead: async () => {
    await api.post('/notifications/read-all')
  },
}

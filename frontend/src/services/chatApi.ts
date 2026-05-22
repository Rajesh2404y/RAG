import api from './apiClient'

export const chatApi = {
  send: async (payload: { collection_id: string; message: string; session_id?: string }) => {
    const { data } = await api.post('/chat/', payload)
    return data
  },
  streamUrl: (payload: { collection_id: string; message: string; session_id?: string }) =>
    `/api/v1/chat/`,
  listSessions: async () => { const { data } = await api.get('/chat/sessions'); return data },
  getSession: async (id: string) => { const { data } = await api.get(`/chat/sessions/${id}`); return data },
  renameSession: async (id: string, title: string) => { const { data } = await api.put(`/chat/sessions/${id}`, { title }); return data },
  deleteSession: async (id: string) => { await api.delete(`/chat/sessions/${id}`) },
}

export const searchApi = {
  search: async (payload: { collection_id?: string; query: string; top_k?: number }) => {
    const { data } = await api.post('/search/', payload)
    return data
  },
}

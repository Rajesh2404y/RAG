import api from './apiClient'

export const collectionsApi = {
  list: async () => { const { data } = await api.get('/collections/'); return data },
  create: async (payload: { name: string; description?: string }) => { const { data } = await api.post('/collections/', payload); return data },
  update: async (id: string, payload: { name?: string; description?: string }) => { const { data } = await api.put(`/collections/${id}`, payload); return data },
  delete: async (id: string) => { await api.delete(`/collections/${id}`); return id },
}

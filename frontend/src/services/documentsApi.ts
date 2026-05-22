import api from './apiClient'

export const documentsApi = {
  upload: async (collectionId: string, files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const { data } = await api.post(`/documents/upload/${collectionId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / (e.total ?? 1))),
    })
    return data
  },

  // GET /documents/collection/{collectionId}
  list: async (collectionId: string) => {
    const { data } = await api.get(`/documents/collection/${collectionId}`)
    return data
  },

  // GET /documents/doc/{documentId}/status
  status: async (documentId: string) => {
    const { data } = await api.get(`/documents/doc/${documentId}/status`)
    return data
  },

  // DELETE /documents/doc/{documentId}
  delete: async (documentId: string) => {
    await api.delete(`/documents/doc/${documentId}`)
  },

  retry: async (documentId: string) => {
    const { data } = await api.post(`/documents/doc/${documentId}/retry`)
    return data
  },

  recoverStuck: async () => {
    const { data } = await api.post('/documents/recover-stuck')
    return data
  },
}

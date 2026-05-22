import api from './apiClient'

export const authApi = {
  login: async (creds: { email: string; password: string }) => {
    const { data } = await api.post('/auth/login', creds)
    return data
  },
  register: async (payload: { email: string; password: string; full_name?: string }) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  },
  me: async () => {
    const { data } = await api.get('/users/me')
    return data
  },
  updateMe: async (payload: { full_name?: string; job_title?: string; avatar_url?: string }) => {
    const { data } = await api.put('/users/me', payload)
    return data
  },
  changePassword: async (payload: { current_password: string; new_password: string }) => {
    await api.post('/users/me/password', payload)
  },
}

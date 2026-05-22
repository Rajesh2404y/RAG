/**
 * Axios instance — attaches JWT, handles 401 token refresh.
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', timeout: 30000 })

// Lazy store import to break circular dependency:
// store -> authSlice -> authApi -> apiClient -> store
const getStore = () => import('../store').then((m) => m.store)

api.interceptors.request.use(async (config) => {
  const store = await getStore()
  const token = store.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const store = await getStore()
      const { logout, setTokens } = await import('../store/slices/authSlice')
      const refreshToken = store.getState().auth.refreshToken
      if (!refreshToken) { store.dispatch(logout()); return Promise.reject(error) }
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', null, { params: { refresh_token: refreshToken } })
        store.dispatch(setTokens(data))
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        store.dispatch(logout())
      }
    }
    return Promise.reject(error)
  }
)

export default api

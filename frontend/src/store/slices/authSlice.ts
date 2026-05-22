import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '../../services/authApi'

interface AuthState {
  user: {
    id: string
    email: string
    role: string
    full_name: string | null
    avatar_url?: string | null
    job_title?: string | null
  } | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  loading: false,
  error: null,
}

export const login = createAsyncThunk('auth/login', async (creds: { email: string; password: string }) => {
  const data = await authApi.login(creds)
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
})

export const register = createAsyncThunk('auth/register', async (payload: { email: string; password: string; full_name?: string }) => {
  return authApi.register(payload)
})

export const restoreSession = createAsyncThunk('auth/restore', authApi.me)
export const updateProfile = createAsyncThunk('auth/updateProfile', authApi.updateMe)
export const changePassword = createAsyncThunk('auth/changePassword', authApi.changePassword)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },
    setTokens(state, action: PayloadAction<{ access_token: string; refresh_token: string }>) {
      state.accessToken = action.payload.access_token
      state.refreshToken = action.payload.refresh_token
      localStorage.setItem('access_token', action.payload.access_token)
      localStorage.setItem('refresh_token', action.payload.refresh_token)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.accessToken = action.payload.access_token
        state.refreshToken = action.payload.refresh_token
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Login failed'
      })
      .addCase(restoreSession.fulfilled, (state, action) => { state.user = action.payload })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload })
  },
})

export const { logout, setTokens } = authSlice.actions
export default authSlice.reducer

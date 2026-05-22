import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState { sidebarOpen: boolean; theme: 'light' | 'dark'; toasts: { id: string; message: string; type: string }[] }

const initialState: UIState = { sidebarOpen: true, theme: 'light', toasts: [] }

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) { state.theme = action.payload },
    addToast(state, action: PayloadAction<{ message: string; type: string }>) {
      state.toasts.push({ id: Date.now().toString(), ...action.payload })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { toggleSidebar, setTheme, addToast, removeToast } = uiSlice.actions
export default uiSlice.reducer

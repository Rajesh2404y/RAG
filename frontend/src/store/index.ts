import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import collectionsReducer from './slices/collectionsSlice'
import chatReducer from './slices/chatSlice'
import uiReducer from './slices/uiSlice'
import notificationsReducer from './slices/notificationsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    collections: collectionsReducer,
    chat: chatReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

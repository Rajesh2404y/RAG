import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useEffect } from 'react'
import { fetchCollections } from '../../store/slices/collectionsSlice'
import { restoreSession } from '../../store/slices/authSlice'
import { fetchNotifications } from '../../store/slices/notificationsSlice'
import { fetchChatSessions } from '../../store/slices/chatSlice'

export function AppLayout() {
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen)
  const collectionCount = useAppSelector((s) => s.collections.items.length)
  const token = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)

  useEffect(() => {
    if (collectionCount === 0) dispatch(fetchCollections())
  }, [collectionCount, dispatch])

  useEffect(() => {
    if (!token) return
    if (!user) dispatch(restoreSession())
    dispatch(fetchNotifications())
    dispatch(fetchChatSessions())
    const timer = window.setInterval(() => dispatch(fetchNotifications()), 30000)
    return () => window.clearInterval(timer)
  }, [dispatch, token, user])

  return (
    <div className="app-shell-bg flex h-screen overflow-hidden text-foreground transition-colors duration-500">
      <Sidebar />
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

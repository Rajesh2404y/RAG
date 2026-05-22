import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { removeToast } from '../../store/slices/uiSlice'
import { X } from 'lucide-react'

export function Toaster() {
  const dispatch = useAppDispatch()
  const toasts = useAppSelector((s) => s.ui.toasts)
  if (!toasts.length) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-sm space-y-2">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`animate-in slide-in-from-right rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
            t.type === 'error' 
              ? 'border-destructive bg-destructive/90 text-destructive-foreground' 
              : 'border-primary/40 bg-primary/90 text-primary-foreground'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{t.message}</span>
            <button 
              onClick={() => dispatch(removeToast(t.id))} 
              className="rounded-lg p-1 opacity-70 hover:bg-white/10 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

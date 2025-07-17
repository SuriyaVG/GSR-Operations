import * as React from "react"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast as toastService, type Toast, type ToastOptions } from "@/lib/toast"

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const toastStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800"
}

const iconStyles = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400"
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = toastIcons[toast.type]
  
  return (
    <div
      className={cn(
        "flex items-start p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-right-full",
        toastStyles[toast.type]
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn("h-5 w-5 mt-0.5 mr-3 flex-shrink-0", iconStyles[toast.type])} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-5">
          {toast.message}
        </p>
      </div>
      
      {toast.options.dismissible && (
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-3 flex-shrink-0 rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export interface ToastContainerProps {
  position?: ToastOptions['position']
  className?: string
}

export function ToastContainer({ 
  position = 'top-right',
  className 
}: ToastContainerProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  React.useEffect(() => {
    const unsubscribe = toastService.subscribe(setToasts)
    return unsubscribe
  }, [])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  if (toasts.length === 0) return null

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col space-y-2 w-full max-w-sm pointer-events-none",
        positionClasses[position],
        className
      )}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onDismiss={toastService.dismiss}
          />
        </div>
      ))}
    </div>
  )
}

// Hook for using toast in components
export function useToast() {
  return {
    toast: toastService,
    success: toastService.success,
    error: toastService.error,
    warning: toastService.warning,
    info: toastService.info,
    dismiss: toastService.dismiss,
    clear: toastService.clear
  }
}
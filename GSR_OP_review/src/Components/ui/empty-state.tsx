import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center space-y-4",
      className
    )}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border border-amber-200">
        <Icon className="w-8 h-8 text-amber-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {description}
        </p>
      </div>
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className={cn(
            action.variant === "default" && "bg-amber-400 hover:bg-amber-500 text-white"
          )}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
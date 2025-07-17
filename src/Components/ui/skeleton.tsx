import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Table Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                "h-4",
                colIndex === 0 ? "flex-1" : "w-20"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export interface CardSkeletonProps {
  variant?: "default" | "compact" | "detailed"
  className?: string
}

function CardSkeleton({ 
  variant = "default", 
  className 
}: CardSkeletonProps) {
  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg p-4 space-y-3",
      className
    )}>
      {variant === "compact" && (
        <>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </>
      )}
      
      {variant === "default" && (
        <>
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </>
      )}
      
      {variant === "detailed" && (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-amber-100">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </>
      )}
    </div>
  )
}

export interface FormSkeletonProps {
  fields?: number
  className?: string
}

function FormSkeleton({ 
  fields = 4, 
  className 
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={`field-${index}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      
      <div className="flex justify-end space-x-2 pt-4">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, FormSkeleton } 
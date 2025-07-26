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

export interface PageSkeletonProps {
  variant?: "dashboard" | "list" | "form"
  className?: string
}

function PageSkeleton({ 
  variant = "list", 
  className 
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {variant === "dashboard" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={`stats-${i}`} variant="compact" />
            ))}
          </div>
          
          {/* Charts/Metrics */}
          <div className="grid lg:grid-cols-2 gap-6">
            <CardSkeleton variant="detailed" />
            <CardSkeleton variant="detailed" />
          </div>
          
          {/* Recent Activity */}
          <CardSkeleton variant="detailed" />
        </>
      )}

      {variant === "list" && (
        <>
          {/* Search/Filter Bar */}
          <div className="bg-white/70 backdrop-blur-sm border border-amber-200 rounded-lg p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
          
          {/* Tabs */}
          <div className="space-y-4">
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`tab-${i}`} className="h-10 w-24 rounded-md" />
              ))}
            </div>
            
            {/* Content */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={`item-${i}`} variant="default" />
              ))}
            </div>
          </div>
        </>
      )}

      {variant === "form" && (
        <div className="max-w-2xl mx-auto">
          <CardSkeleton variant="detailed" className="p-6">
            <FormSkeleton fields={6} />
          </CardSkeleton>
        </div>
      )}
    </div>
  )
}

export interface StatsCardSkeletonProps {
  count?: number
  className?: string
}

function StatsCardSkeleton({ 
  count = 4, 
  className 
}: StatsCardSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={`stats-card-${i}`} className="bg-white/70 backdrop-blur-sm border border-amber-200 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-2xl" />
          </div>
          <div className="mt-4">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface ListSkeletonProps {
  rows?: number
  showSearch?: boolean
  showTabs?: boolean
  className?: string
}

function ListSkeleton({ 
  rows = 5, 
  showSearch = true, 
  showTabs = true, 
  className 
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {showSearch && (
        <div className="bg-white/70 backdrop-blur-sm border border-amber-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      )}
      
      {showTabs && (
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`tab-${i}`} className="h-10 w-24 rounded-md" />
          ))}
        </div>
      )}
      
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={`list-item-${i}`} variant="default" />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, FormSkeleton, PageSkeleton, StatsCardSkeleton, ListSkeleton } 
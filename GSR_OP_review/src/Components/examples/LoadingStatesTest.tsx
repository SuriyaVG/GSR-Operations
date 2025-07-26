import React from 'react'
import { EmptyState } from '../ui/empty-state'
import { 
  Skeleton,
  TableSkeleton, 
  CardSkeleton, 
  FormSkeleton 
} from '../ui/skeleton'
import { Package } from 'lucide-react'

// Simple test component to verify all components render correctly
export function LoadingStatesTest() {
  return (
    <div className="p-4 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Basic Skeleton</h2>
        <Skeleton className="h-4 w-48" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Table Skeleton</h2>
        <TableSkeleton rows={3} columns={3} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Card Skeletons</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton variant="default" />
          <CardSkeleton variant="compact" />
          <CardSkeleton variant="detailed" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Form Skeleton</h2>
        <FormSkeleton fields={3} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Empty State</h2>
        <EmptyState
          icon={Package}
          title="Test Empty State"
          description="This is a test of the empty state component with amber styling."
          action={{
            label: "Test Action",
            onClick: () => console.log("Action clicked")
          }}
        />
      </div>
    </div>
  )
}
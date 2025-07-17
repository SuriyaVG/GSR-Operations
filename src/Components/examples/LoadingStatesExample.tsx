import React, { useState } from 'react'
import { EmptyState } from '../ui/empty-state'
import { 
  TableSkeleton, 
  CardSkeleton, 
  FormSkeleton 
} from '../ui/skeleton'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Package, Users, FileText, Plus } from 'lucide-react'

export function LoadingStatesExample() {
  const [activeDemo, setActiveDemo] = useState<'table' | 'cards' | 'form' | 'empty'>('table')
  const [isLoading, setIsLoading] = useState(true)

  const toggleLoading = () => setIsLoading(!isLoading)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Loading States & Empty States Demo</h1>
        <Button onClick={toggleLoading} variant="outline">
          {isLoading ? 'Show Content' : 'Show Loading'}
        </Button>
      </div>

      {/* Demo Navigation */}
      <div className="flex space-x-2 border-b border-amber-200">
        {[
          { key: 'table', label: 'Table Loading', icon: FileText },
          { key: 'cards', label: 'Card Loading', icon: Package },
          { key: 'form', label: 'Form Loading', icon: Users },
          { key: 'empty', label: 'Empty States', icon: Plus }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveDemo(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeDemo === key
                ? 'border-amber-400 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 inline mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className="space-y-6">
        {activeDemo === 'table' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Table Loading States</h2>
            {isLoading ? (
              <div className="space-y-4">
                <TableSkeleton rows={5} columns={4} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex space-x-4 font-medium text-gray-700 border-b border-gray-200 pb-2">
                  <div className="flex-1">Product Name</div>
                  <div className="w-20">SKU</div>
                  <div className="w-20">Stock</div>
                  <div className="w-20">Price</div>
                </div>
                {[
                  { name: 'Premium Blend A', sku: 'PBA-001', stock: '150L', price: '$45.00' },
                  { name: 'Standard Mix B', sku: 'SMB-002', stock: '200L', price: '$32.00' },
                  { name: 'Custom Formula C', sku: 'CFC-003', stock: '75L', price: '$58.00' },
                  { name: 'Economy Blend D', sku: 'EBD-004', stock: '300L', price: '$28.00' },
                  { name: 'Specialty Mix E', sku: 'SME-005', stock: '120L', price: '$65.00' }
                ].map((item, index) => (
                  <div key={index} className="flex space-x-4 py-2 border-b border-gray-100">
                    <div className="flex-1">{item.name}</div>
                    <div className="w-20 text-gray-600">{item.sku}</div>
                    <div className="w-20 text-gray-600">{item.stock}</div>
                    <div className="w-20 font-medium text-amber-600">{item.price}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeDemo === 'cards' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Card Loading States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  <CardSkeleton variant="default" />
                  <CardSkeleton variant="compact" />
                  <CardSkeleton variant="detailed" />
                </>
              ) : (
                <>
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Default Card</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">This is a standard card with regular content layout.</p>
                      <p className="text-sm text-gray-600">It shows typical information display.</p>
                    </div>
                    <div className="flex justify-between">
                      <Button size="sm">Action</Button>
                      <span className="text-sm text-gray-500">Status</span>
                    </div>
                  </Card>

                  <Card className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Package className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-gray-900">Compact Card</h3>
                        <p className="text-sm text-gray-500">Condensed layout</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Detailed Card</h3>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Active</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">This card has more detailed information.</p>
                      <p className="text-sm text-gray-600">Multiple lines of content are displayed.</p>
                      <p className="text-sm text-gray-600">With additional metadata and context.</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Tag 1</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Tag 2</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Tag 3</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <Button size="sm">Primary Action</Button>
                      <Button size="sm" variant="ghost">
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {activeDemo === 'form' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Form Loading States</h2>
            {isLoading ? (
              <FormSkeleton fields={6} />
            ) : (
              <form className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500" 
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SKU</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500" 
                    placeholder="Enter SKU"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500">
                    <option>Select category</option>
                    <option>Premium Blends</option>
                    <option>Standard Mixes</option>
                    <option>Custom Formulas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Price</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500" 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500" 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-1 focus:ring-amber-500" 
                    rows={3}
                    placeholder="Enter product description"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Product</Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {activeDemo === 'empty' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Empty State Examples</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <EmptyState
                  icon={Package}
                  title="No products found"
                  description="You haven't added any products yet. Start by creating your first product to get started."
                  action={{
                    label: "Add Product",
                    onClick: () => alert("Add product clicked!")
                  }}
                />
              </Card>

              <Card className="p-6">
                <EmptyState
                  icon={Users}
                  title="No customers yet"
                  description="Your customer list is empty. Add customers to start managing your relationships and orders."
                  action={{
                    label: "Add Customer",
                    onClick: () => alert("Add customer clicked!"),
                    variant: "outline"
                  }}
                />
              </Card>

              <Card className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No orders found"
                  description="There are no orders matching your current filters. Try adjusting your search criteria."
                />
              </Card>

              <Card className="p-6">
                <EmptyState
                  icon={Package}
                  title="Inventory is empty"
                  description="Your inventory is running low. Consider restocking your most popular items to avoid stockouts."
                  action={{
                    label: "Restock Items",
                    onClick: () => alert("Restock clicked!"),
                    variant: "secondary"
                  }}
                />
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
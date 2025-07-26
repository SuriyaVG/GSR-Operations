import React, { useState } from 'react'
import { CreatableCombobox, CreatableComboboxOption } from '../ui/creatable-combobox'

// Example data types for different master data
interface Supplier extends CreatableComboboxOption {
  value: string
  label: string
  contactEmail?: string
}

interface Material extends CreatableComboboxOption {
  value: string
  label: string
  category?: string
}

interface Customer extends CreatableComboboxOption {
  value: string
  label: string
  tier?: 'premium' | 'wholesale' | 'standard'
}

interface Vendor extends CreatableComboboxOption {
  value: string
  label: string
  type?: string
}

// Mock data
const mockSuppliers: Supplier[] = [
  { value: '1', label: 'ABC Chemicals Ltd', contactEmail: 'contact@abc.com' },
  { value: '2', label: 'XYZ Materials Inc', contactEmail: 'info@xyz.com' },
  { value: '3', label: 'Global Supplies Co', contactEmail: 'sales@global.com' }
]

const mockMaterials: Material[] = [
  { value: '1', label: 'Ethanol 95%', category: 'Solvent' },
  { value: '2', label: 'Sodium Chloride', category: 'Salt' },
  { value: '3', label: 'Distilled Water', category: 'Solvent' }
]

const mockCustomers: Customer[] = [
  { value: '1', label: 'Premium Corp', tier: 'premium' },
  { value: '2', label: 'Wholesale Distributors', tier: 'wholesale' },
  { value: '3', label: 'Standard Client Ltd', tier: 'standard' }
]

const mockVendors: Vendor[] = [
  { value: '1', label: 'Logistics Express', type: 'Transport' },
  { value: '2', label: 'Quality Testing Lab', type: 'Testing' },
  { value: '3', label: 'Packaging Solutions', type: 'Packaging' }
]

export function CreatableComboboxExample() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>()
  const [selectedMaterial, setSelectedMaterial] = useState<Material>()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>()
  const [selectedVendor, setSelectedVendor] = useState<Vendor>()

  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers)
  const [materials, setMaterials] = useState<Material[]>(mockMaterials)
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [vendors, setVendors] = useState<Vendor[]>(mockVendors)

  // Mock create functions - in real app these would call APIs
  const createSupplier = async (name: string): Promise<Supplier> => {
    const newSupplier: Supplier = {
      value: Date.now().toString(),
      label: name,
      contactEmail: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`
    }
    setSuppliers(prev => [...prev, newSupplier])
    return newSupplier
  }

  const createMaterial = async (name: string): Promise<Material> => {
    const newMaterial: Material = {
      value: Date.now().toString(),
      label: name,
      category: 'Other'
    }
    setMaterials(prev => [...prev, newMaterial])
    return newMaterial
  }

  const createCustomer = async (name: string): Promise<Customer> => {
    const newCustomer: Customer = {
      value: Date.now().toString(),
      label: name,
      tier: 'standard'
    }
    setCustomers(prev => [...prev, newCustomer])
    return newCustomer
  }

  const createVendor = async (name: string): Promise<Vendor> => {
    const newVendor: Vendor = {
      value: Date.now().toString(),
      label: name,
      type: 'Other'
    }
    setVendors(prev => [...prev, newVendor])
    return newVendor
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          CreatableCombobox Examples
        </h1>
        <p className="text-gray-600">
          Demonstrating master data entry with "+ New" functionality
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Selection */}
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Supplier Selection
          </h2>
          <CreatableCombobox
            options={suppliers}
            value={selectedSupplier}
            onSelect={setSelectedSupplier}
            onCreate={createSupplier}
            placeholder="Select or create supplier..."
            createLabel="+ Add new supplier"
            className="mb-4"
          />
          {selectedSupplier && (
            <div className="text-sm text-gray-600">
              <p><strong>Selected:</strong> {selectedSupplier.label}</p>
              {selectedSupplier.contactEmail && (
                <p><strong>Email:</strong> {selectedSupplier.contactEmail}</p>
              )}
            </div>
          )}
        </div>

        {/* Material Selection */}
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Material Selection
          </h2>
          <CreatableCombobox
            options={materials}
            value={selectedMaterial}
            onSelect={setSelectedMaterial}
            onCreate={createMaterial}
            placeholder="Select or create material..."
            createLabel="+ Add new material"
            className="mb-4"
          />
          {selectedMaterial && (
            <div className="text-sm text-gray-600">
              <p><strong>Selected:</strong> {selectedMaterial.label}</p>
              {selectedMaterial.category && (
                <p><strong>Category:</strong> {selectedMaterial.category}</p>
              )}
            </div>
          )}
        </div>

        {/* Customer Selection */}
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Customer Selection
          </h2>
          <CreatableCombobox
            options={customers}
            value={selectedCustomer}
            onSelect={setSelectedCustomer}
            onCreate={createCustomer}
            placeholder="Select or create customer..."
            createLabel="+ Add new customer"
            className="mb-4"
          />
          {selectedCustomer && (
            <div className="text-sm text-gray-600">
              <p><strong>Selected:</strong> {selectedCustomer.label}</p>
              {selectedCustomer.tier && (
                <p><strong>Tier:</strong> {selectedCustomer.tier}</p>
              )}
            </div>
          )}
        </div>

        {/* Vendor Selection */}
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Vendor Selection
          </h2>
          <CreatableCombobox
            options={vendors}
            value={selectedVendor}
            onSelect={setSelectedVendor}
            onCreate={createVendor}
            placeholder="Select or create vendor..."
            createLabel="+ Add new vendor"
            className="mb-4"
          />
          {selectedVendor && (
            <div className="text-sm text-gray-600">
              <p><strong>Selected:</strong> {selectedVendor.label}</p>
              {selectedVendor.type && (
                <p><strong>Type:</strong> {selectedVendor.type}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-amber-800 mb-3">
          Usage Instructions
        </h3>
        <ul className="text-amber-700 space-y-2">
          <li>• Click on any dropdown to see existing options</li>
          <li>• Type to search through available options</li>
          <li>• Use arrow keys to navigate through options</li>
          <li>• Press Enter to select highlighted option</li>
          <li>• Click "+ Add new" or press Enter when no matches to create new items</li>
          <li>• Press Escape to close the dropdown</li>
        </ul>
      </div>
    </div>
  )
}

export default CreatableComboboxExample
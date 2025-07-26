import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/Components/ui/dialog';
import { toast } from '@/lib/toast';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { format } from 'date-fns';
import { AlertCircle, Edit2 } from 'lucide-react';
import { materialIntakeSchema, validateWithSchema, validateField } from '@/lib/validationSchemas';
import type { MaterialIntakeFormData } from '@/lib/validationSchemas';
import { InputField, TextareaField, SelectField, FormErrorSummary } from '@/Components/ui/form-field';
import { CreatableCombobox } from '@/Components/ui/creatable-combobox';
import { AddSupplierModal } from '@/Components/ui/AddSupplierModal';
import SupplierService from '@/services/SupplierService';
import { AddRawMaterialModal } from '@/Components/ui/AddRawMaterialModal';
import RawMaterialService from '@/services/RawMaterialService';

export default function MaterialIntakeForm({ suppliers: initialSuppliers, rawMaterials: initialRawMaterials, onSave, onCancel }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers || []);
  const [rawMaterials, setRawMaterials] = useState(initialRawMaterials || []);
  const [formData, setFormData] = useState({
    supplier_id: '',
    raw_material_id: '',
    quantity: '',
    cost_per_unit: '',
    lot_number: '',
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    quality_notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddRawMaterialModal, setShowAddRawMaterialModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [editRawMaterial, setEditRawMaterial] = useState(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation for numeric fields
    if (field === 'quantity' || field === 'cost_per_unit') {
      if (value === '') {
        // Clear error when field is empty (will be caught by required validation)
        return;
      }
      
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        // Show error for non-numeric values
        setErrors(prev => ({ 
          ...prev, 
          [field]: field === 'quantity' 
            ? 'Quantity must be a valid number' 
            : 'Cost per unit must be a valid number' 
        }));
        return;
      }
      
      if (numericValue <= 0) {
        // Show error for zero or negative values
        setErrors(prev => ({ 
          ...prev, 
          [field]: field === 'quantity' 
            ? 'Quantity must be greater than zero' 
            : 'Cost per unit must be greater than zero' 
        }));
        return;
      }
      
      // Validate with schema for additional rules (max values, etc.)
      const validationData = {
        ...formData,
        quantity: field === 'quantity' ? numericValue : parseFloat(formData.quantity) || 0,
        cost_per_unit: field === 'cost_per_unit' ? numericValue : parseFloat(formData.cost_per_unit) || 0,
        supplier_id: formData.supplier_id || 'temp',
        raw_material_id: formData.raw_material_id || 'temp',
        intake_date: formData.intake_date
      };
      
      const fieldError = validateField(materialIntakeSchema, field, numericValue, validationData);
      if (fieldError) {
        setErrors(prev => ({ ...prev, [field]: fieldError }));
      }
    }

    // Date validation for expiry date
    if (field === 'expiry_date' && value) {
      const intakeDate = new Date(formData.intake_date);
      const expiryDate = new Date(value);
      
      if (!isNaN(expiryDate.getTime()) && !isNaN(intakeDate.getTime())) {
        if (expiryDate <= intakeDate) {
          setErrors(prev => ({ 
            ...prev, 
            [field]: 'Expiry date must be after intake date' 
          }));
        }
      }
    }

    // In the date validation, show a clear error if the intake date is in the future
    if (field === 'intake_date' && value) {
      const intakeDate = new Date(value);
      const today = new Date();
      if (!isNaN(intakeDate.getTime()) && intakeDate > today) {
        setErrors(prev => ({ ...prev, [field]: 'Intake date cannot be in the future' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Check if required fields are filled
    const requiredFields = {
      supplier_id: 'Please select a supplier',
      raw_material_id: 'Please select a raw material',
      quantity: 'Quantity is required',
      cost_per_unit: 'Cost per unit is required',
      intake_date: 'Intake date is required'
    };

    const newErrors = {};
    let hasErrors = false;

    // Check each required field
    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!formData[field]) {
        newErrors[field] = message;
        hasErrors = true;
      }
    });

    // Check numeric fields
    if (formData.quantity && (isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0)) {
      newErrors['quantity'] = 'Quantity must be a positive number';
      hasErrors = true;
    }

    if (formData.cost_per_unit && (isNaN(parseFloat(formData.cost_per_unit)) || parseFloat(formData.cost_per_unit) <= 0)) {
      newErrors['cost_per_unit'] = 'Cost per unit must be a positive number';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Prepare data for validation
    const submitData = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      cost_per_unit: parseFloat(formData.cost_per_unit)
    };

    try {
      const total_cost = submitData.quantity * submitData.cost_per_unit;
      console.log('Saving material intake:', { ...submitData, total_cost });
      
      // Make sure we're sending the right data format
      const dataToSave = {
        supplier_id: formData.supplier_id,
        raw_material_id: formData.raw_material_id,
        quantity: parseFloat(formData.quantity),
        cost_per_unit: parseFloat(formData.cost_per_unit),
        lot_number: formData.lot_number,
        intake_date: formData.intake_date,
        expiry_date: formData.expiry_date || null,
        quality_notes: formData.quality_notes || '',
        total_cost: parseFloat(formData.quantity) * parseFloat(formData.cost_per_unit)
      };
      
      await onSave(dataToSave);
      // Close the form on successful save
      onCancel();
    } catch (error) {
      console.error('Error saving material intake:', error);
      setErrors({ general: 'Failed to save material intake. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for adding a new supplier
  async function handleAddSupplier(data) {
    try {
      console.log('Adding supplier with data:', data);
      const newSupplier = await SupplierService.create(data);
      console.log('Supplier created:', newSupplier);
      setSuppliers(prev => [...prev, newSupplier]);
      setFormData(prev => ({ ...prev, supplier_id: newSupplier.id }));
      setShowAddSupplierModal(false);
      toast.success('Supplier added successfully!');
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error(`Failed to add supplier: ${error.message}`);
    }
  }

  // Handler for editing a supplier
  async function handleEditSupplier(data) {
    try {
      console.log('Updating supplier with data:', data);
      const updatedSupplier = await SupplierService.update(data.id, data);
      console.log('Supplier updated:', updatedSupplier);
      setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
      setFormData(prev => ({ ...prev, supplier_id: updatedSupplier.id }));
      setEditSupplier(null);
      toast.success('Supplier updated successfully!');
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error(`Failed to update supplier: ${error.message}`);
    }
  }

  // Handler for adding a new raw material
  async function handleAddRawMaterial(data) {
    try {
      console.log('Adding raw material with data:', data);
      const newRawMaterial = await RawMaterialService.create(data);
      console.log('Raw material created:', newRawMaterial);
      setRawMaterials(prev => [...prev, newRawMaterial]);
      setFormData(prev => ({ ...prev, raw_material_id: newRawMaterial.id }));
      setShowAddRawMaterialModal(false);
      toast.success('Raw material added successfully!');
    } catch (error) {
      console.error('Error adding raw material:', error);
      toast.error(`Failed to add raw material: ${error.message}`);
    }
  }

  // Handler for editing a raw material
  async function handleEditRawMaterial(data) {
    try {
      console.log('Updating raw material with data:', data);
      const updatedRawMaterial = await RawMaterialService.update(data.id, data);
      console.log('Raw material updated:', updatedRawMaterial);
      setRawMaterials(prev => prev.map(rm => rm.id === updatedRawMaterial.id ? updatedRawMaterial : rm));
      setFormData(prev => ({ ...prev, raw_material_id: updatedRawMaterial.id }));
      setEditRawMaterial(null);
      toast.success('Raw material updated successfully!');
    } catch (error) {
      console.error('Error updating raw material:', error);
      toast.error(`Failed to update raw material: ${error.message}`);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl bg-white/90 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Material Intake</DialogTitle>
          <DialogDescription>
            Record a new material intake entry. Fill in all required fields to track your inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {errors.general && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <FormErrorSummary errors={errors} className="mb-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div>
              <label>Supplier *</label>
              <div className="flex items-center gap-2">
                <CreatableCombobox
                  options={suppliers}
                  value={suppliers.find(s => s.id === formData.supplier_id)}
                  onSelect={supplier => setFormData(prev => ({ ...prev, supplier_id: supplier.id }))}
                  onCreate={() => setShowAddSupplierModal(true)}
                  displayField="name"
                  placeholder="Select or add supplier..."
                  createLabel="+ Add new supplier"
                />
                {formData.supplier_id && (
                  <button
                    type="button"
                    className="ml-2 p-1 rounded hover:bg-amber-100"
                    onClick={() => setEditSupplier(suppliers.find(s => s.id === formData.supplier_id))}
                    title="Edit supplier"
                  >
                    <Edit2 className="w-4 h-4 text-amber-600" />
                  </button>
                )}
              </div>
              {errors.supplier_id && (
                <p className="text-sm text-red-500 mt-1">{errors.supplier_id}</p>
              )}
              <AddSupplierModal
                open={showAddSupplierModal || !!editSupplier}
                onClose={() => { setShowAddSupplierModal(false); setEditSupplier(null); }}
                onSave={editSupplier ? handleEditSupplier : handleAddSupplier}
                initialData={editSupplier || undefined}
                isEdit={!!editSupplier}
              />
            </div>
            
            <div>
              <label>Raw Material *</label>
              <div className="flex items-center gap-2">
                <CreatableCombobox
                  options={rawMaterials}
                  value={rawMaterials.find(rm => rm.id === formData.raw_material_id)}
                  onSelect={rm => setFormData(prev => ({ ...prev, raw_material_id: rm.id }))}
                  onCreate={() => setShowAddRawMaterialModal(true)}
                  displayField="name"
                  placeholder="Select or add raw material..."
                  createLabel="+ Add new raw material"
                />
                {formData.raw_material_id && (
                  <button
                    type="button"
                    className="ml-2 p-1 rounded hover:bg-amber-100"
                    onClick={() => setEditRawMaterial(rawMaterials.find(rm => rm.id === formData.raw_material_id))}
                    title="Edit raw material"
                  >
                    <Edit2 className="w-4 h-4 text-amber-600" />
                  </button>
                )}
              </div>
              {errors.raw_material_id && (
                <p className="text-sm text-red-500 mt-1">{errors.raw_material_id}</p>
              )}
              <AddRawMaterialModal
                open={showAddRawMaterialModal || !!editRawMaterial}
                onClose={() => { setShowAddRawMaterialModal(false); setEditRawMaterial(null); }}
                onSave={editRawMaterial ? handleEditRawMaterial : handleAddRawMaterial}
                initialData={editRawMaterial || undefined}
                isEdit={!!editRawMaterial}
              />
            </div>
            
            <InputField
              id="quantity"
              label="Quantity"
              type="number"
              required
              autoComplete="off"
              value={formData.quantity}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || parseFloat(value) >= 0) {
                  handleChange('quantity', value);
                }
              }}
              placeholder="Enter quantity"
              step="0.01"
              min="0"
              error={errors.quantity}
            />
            
            <InputField
              id="cost_per_unit"
              label="Cost per Unit (₹)"
              type="number"
              required
              autoComplete="off"
              value={formData.cost_per_unit}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || parseFloat(value) >= 0) {
                  handleChange('cost_per_unit', value);
                }
              }}
              placeholder="Enter cost per unit"
              step="0.01"
              min="0"
              error={errors.cost_per_unit}
            />
            
            <InputField
              id="lot_number"
              label="Lot Number"
              value={formData.lot_number}
              onChange={(e) => handleChange('lot_number', e.target.value)}
              placeholder="Enter lot number (optional)"
              error={errors.lot_number}
            />
            
            <InputField
              id="intake_date"
              label="Intake Date"
              type="date"
              required
              value={formData.intake_date}
              onChange={(e) => handleChange('intake_date', e.target.value)}
              error={errors.intake_date}
            />
            
            <InputField
              id="expiry_date"
              label="Expiry Date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              error={errors.expiry_date}
            />
            
            <TextareaField
              id="quality_notes"
              label="Quality Notes"
              value={formData.quality_notes}
              onChange={(e) => handleChange('quality_notes', e.target.value)}
              placeholder="Enter quality assessment notes (optional)"
              rows={3}
              error={errors.quality_notes}
              className="md:col-span-2"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Intake'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
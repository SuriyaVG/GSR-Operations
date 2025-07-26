import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { format } from 'date-fns';
import { Calculator, Plus, X, AlertCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { productionBatchSchema, validateWithSchema, validateField } from '@/lib/validationSchemas';
import type { ProductionBatchFormData } from '@/lib/validationSchemas';
import { InputField, TextareaField, SelectField, FormErrorSummary } from '@/Components/ui/form-field';
import { cn } from '@/utils';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { AddRawMaterialModal } from '@/components/ui/AddRawMaterialModal';
import RawMaterialService from '@/services/RawMaterialService';

export default function ProductionForm({ materials, rawMaterials, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    batch_number: `GR-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    production_date: format(new Date(), 'yyyy-MM-dd'),
    output_litres: '',
    quality_notes: '',
    status: 'in_progress'
  });

  const [selectedInputs, setSelectedInputs] = useState([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRawMaterialModal, setShowAddRawMaterialModal] = useState(false);
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
    if (field === 'output_litres') {
      const numericValue = parseFloat(value);
      if (value && !isNaN(numericValue)) {
        if (numericValue <= 0) {
          setErrors(prev => ({ 
            ...prev, 
            [field]: 'Output must be greater than zero' 
          }));
        } else {
          const validationData = {
            ...formData,
            [field]: numericValue,
            inputs: selectedInputs.map(input => ({
              material_intake_id: input.material_intake_id,
              quantity_used: parseFloat(input.quantity_used) || 0
            }))
          };
          const fieldError = validateField(productionBatchSchema, field, numericValue, validationData);
          if (fieldError) {
            setErrors(prev => ({ ...prev, [field]: fieldError }));
          }
        }
      } else if (value && isNaN(numericValue)) {
        setErrors(prev => ({ 
          ...prev, 
          [field]: 'Output must be a valid number' 
        }));
      } else if (value === '0' || numericValue === 0) {
        setErrors(prev => ({ 
          ...prev, 
          [field]: 'Output must be greater than zero' 
        }));
      }
    }

    // Date validation for production date
    if (field === 'production_date' && value) {
      const productionDate = new Date(value);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      if (!isNaN(productionDate.getTime())) {
        if (productionDate > today) {
          setErrors(prev => ({ 
            ...prev, 
            [field]: 'Production date cannot be in the future' 
          }));
        } else if (productionDate < oneYearAgo) {
          setErrors(prev => ({ 
            ...prev, 
            [field]: 'Production date cannot be more than a year old' 
          }));
        }
      }
    }
  };

  const addInput = () => {
    setSelectedInputs(prev => [...prev, { material_intake_id: '', quantity_used: '' }]);
  };

  const removeInput = (index) => {
    setSelectedInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateInput = (index: number, field: string, value: string) => {
    setSelectedInputs(prev => 
      prev.map((input, i) => i === index ? { ...input, [field]: value } : input)
    );

    // Clear input-specific errors
    const inputErrorKey = `inputs.${index}.${field}`;
    if (errors[inputErrorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inputErrorKey];
        return newErrors;
      });
    }

    // Real-time validation for quantity_used
    if (field === 'quantity_used') {
      const numericValue = parseFloat(value);
      
      // Check if the material is selected
      const materialId = selectedInputs[index].material_intake_id;
      if (!materialId && value) {
        setErrors(prev => ({ 
          ...prev, 
          [inputErrorKey]: 'Please select a material first' 
        }));
        return;
      }
      
      if (value && !isNaN(numericValue)) {
        if (numericValue <= 0) {
          setErrors(prev => ({ 
            ...prev, 
            [inputErrorKey]: 'Quantity must be greater than zero' 
          }));
        } else {
          // Check if quantity exceeds available material
          const material = materials.find(m => m.id === materialId);
          if (material && numericValue > material.remaining_quantity) {
            setErrors(prev => ({ 
              ...prev, 
              [inputErrorKey]: `Exceeds available quantity (${material.remaining_quantity} kg)` 
            }));
          } else {
            const updatedInputs = [...selectedInputs];
            updatedInputs[index] = { ...updatedInputs[index], [field]: value };
            
            const validationData = {
              ...formData,
              output_litres: parseFloat(formData.output_litres) || 0,
              inputs: updatedInputs.map(input => ({
                material_intake_id: input.material_intake_id,
                quantity_used: parseFloat(input.quantity_used) || 0
              }))
            };
            
            const fieldError = validateField(productionBatchSchema, `inputs.${index}.quantity_used`, numericValue, validationData);
            if (fieldError) {
              setErrors(prev => ({ ...prev, [inputErrorKey]: fieldError }));
            }
          }
        }
      } else if (value && isNaN(numericValue)) {
        setErrors(prev => ({ 
          ...prev, 
          [inputErrorKey]: 'Quantity must be a valid number' 
        }));
      } else if (value === '0' || numericValue === 0) {
        setErrors(prev => ({ 
          ...prev, 
          [inputErrorKey]: 'Quantity must be greater than zero' 
        }));
      }
    }
  };

  const calculateTotalCost = () => {
    return selectedInputs.reduce((total, input) => {
      const material = materials.find(m => m.id === input.material_intake_id);
      return total + (material ? material.cost_per_unit * (parseFloat(input.quantity_used) || 0) : 0);
    }, 0);
  };

  const calculateCostPerLitre = () => {
    const totalCost = calculateTotalCost();
    const outputLitres = parseFloat(formData.output_litres) || 0;
    return outputLitres > 0 ? totalCost / outputLitres : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Prepare data for validation
    const validationData = {
      ...formData,
      output_litres: parseFloat(formData.output_litres) || 0,
      inputs: selectedInputs.map(input => ({
        material_intake_id: input.material_intake_id,
        quantity_used: parseFloat(input.quantity_used) || 0
      }))
    };

    // Validate with Zod schema
    const validation = validateWithSchema(productionBatchSchema, validationData);
    
    if (!validation.success) {
      setErrors(validation.errors || {});
      setIsSubmitting(false);
      return;
    }

    try {
      const totalCost = calculateTotalCost();
      const costPerLitre = calculateCostPerLitre();
      
      await onSave({
        ...validation.data!,
        total_input_cost: totalCost,
        cost_per_litre: costPerLitre,
        yield_percentage: 0, // Will be calculated based on inputs
      });
    } catch (error) {
      console.error('Error saving production batch:', error);
      setErrors({ general: 'Failed to save production batch. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableMaterials = materials.filter(m => m.remaining_quantity > 0);
  const getRawMaterialName = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    const rawMaterial = rawMaterials.find(r => r.id === material?.raw_material_id);
    return rawMaterial?.name || 'Unknown';
  };

  // Handler for adding a new raw material
  async function handleAddRawMaterial(data) {
    const newRawMaterial = await RawMaterialService.create(data);
    setRawMaterials(prev => [...prev, newRawMaterial]);
    // Optionally, set as selected in the current input row if needed
    setShowAddRawMaterialModal(false);
  }

  // Handler for editing a raw material
  async function handleEditRawMaterial(data) {
    const updatedRawMaterial = await RawMaterialService.update(data.id, data);
    setRawMaterials(prev => prev.map(rm => rm.id === updatedRawMaterial.id ? updatedRawMaterial : rm));
    // Optionally, update the selected input row if needed
    setEditRawMaterial(null);
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Production Batch</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <FormErrorSummary errors={errors} className="mb-4" />

          {/* Basic Information */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Batch Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="batch_number"
                label="Batch Number"
                required
                value={formData.batch_number}
                onChange={(e) => handleChange('batch_number', e.target.value)}
                placeholder="Enter batch number"
                error={errors.batch_number}
              />
              
              <InputField
                id="production_date"
                label="Production Date"
                type="date"
                required
                value={formData.production_date}
                onChange={(e) => handleChange('production_date', e.target.value)}
                error={errors.production_date}
              />
              
              <InputField
                id="output_litres"
                label="Output (Litres)"
                type="number"
                autoComplete="off"
                required
                value={formData.output_litres}
                onChange={(e) => handleChange('output_litres', e.target.value)}
                placeholder="Enter output in litres"
                step="0.1"
                min="0"
                error={errors.output_litres}
              />
              
              <SelectField
                id="status"
                label="Status"
                required
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
                error={errors.status}
                options={[
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'quality_check', label: 'Quality Check' },
                  { value: 'approved', label: 'Approved' }
                ]}
              />
              
              <TextareaField
                id="quality_notes"
                label="Quality Notes"
                value={formData.quality_notes}
                onChange={(e) => handleChange('quality_notes', e.target.value)}
                placeholder="Quality assessment, color, texture, aroma notes..."
                rows={3}
                error={errors.quality_notes}
                className="md:col-span-2"
              />
            </CardContent>
          </Card>

          {/* Input Materials */}
          <Card className="border-amber-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Input Materials</CardTitle>
                <Button type="button" onClick={addInput} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInputs.map((input, index) => (
                <div key={index} className="flex gap-4 items-end p-4 bg-amber-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Material</Label>
                    <div className="flex items-center gap-2">
                      <CreatableCombobox
                        options={rawMaterials}
                        value={rawMaterials.find(rm => rm.id === input.material_intake_id)}
                        onSelect={rm => updateInput(index, 'material_intake_id', rm.id)}
                        onCreate={() => setShowAddRawMaterialModal(true)}
                        displayField="name"
                        placeholder="Select or add raw material..."
                        createLabel="+ Add new raw material"
                      />
                      {input.material_intake_id && (
                        <button
                          type="button"
                          className="ml-2 p-1 rounded hover:bg-amber-100"
                          onClick={() => setEditRawMaterial(rawMaterials.find(rm => rm.id === input.material_intake_id))}
                          title="Edit raw material"
                        >
                          <Edit2 className="w-4 h-4 text-amber-600" />
                        </button>
                      )}
                    </div>
                    <AddRawMaterialModal
                      open={showAddRawMaterialModal || !!editRawMaterial}
                      onClose={() => { setShowAddRawMaterialModal(false); setEditRawMaterial(null); }}
                      onSave={editRawMaterial ? handleEditRawMaterial : handleAddRawMaterial}
                      initialData={editRawMaterial || undefined}
                      isEdit={!!editRawMaterial}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Quantity (kg) *</Label>
                    <Input 
                      type="number" 
                      autoComplete="off"
                      step="0.1"
                      min="0"
                      value={input.quantity_used}
                      onChange={(e) => updateInput(index, 'quantity_used', e.target.value)}
                      className={cn(
                        "transition-colors duration-200",
                        errors[`inputs.${index}.quantity_used`] 
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100" 
                          : "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                      )}
                      placeholder="0.0"
                    />
                    {errors[`inputs.${index}.quantity_used`] && (
                      <div className="flex items-center gap-1 text-sm text-red-600 animate-fadeIn">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium">{errors[`inputs.${index}.quantity_used`]}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => removeInput(index)} 
                    variant="outline" 
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {selectedInputs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Add input materials to calculate batch cost</p>
                </div>
              )}
              
              {errors.inputs && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {errors.inputs}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          {selectedInputs.length > 0 && (
            <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Total Input Cost</p>
                    <p className="text-xl font-bold text-gray-900">₹{calculateTotalCost().toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Cost per Litre</p>
                    <p className="text-xl font-bold text-gray-900">₹{calculateCostPerLitre().toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Expected Output</p>
                    <p className="text-xl font-bold text-gray-900">{formData.output_litres || 0}L</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={selectedInputs.length === 0 || isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Creating...' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
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
import { format } from 'date-fns';
import { Calculator, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

export default function ProductionForm({ materials, rawMaterials, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    batch_number: `GR-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    production_date: format(new Date(), 'yyyy-MM-dd'),
    output_litres: '',
    quality_notes: '',
    status: 'in_progress'
  });

  const [selectedInputs, setSelectedInputs] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addInput = () => {
    setSelectedInputs(prev => [...prev, { material_intake_id: '', quantity_used: '' }]);
  };

  const removeInput = (index) => {
    setSelectedInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateInput = (index, field, value) => {
    setSelectedInputs(prev => 
      prev.map((input, i) => i === index ? { ...input, [field]: value } : input)
    );
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalCost = calculateTotalCost();
    const costPerLitre = calculateCostPerLitre();
    
    onSave({
      ...formData,
      output_litres: parseFloat(formData.output_litres),
      total_input_cost: totalCost,
      cost_per_litre: costPerLitre,
      yield_percentage: 0, // Will be calculated based on inputs
      inputs: selectedInputs
    });
  };

  const availableMaterials = materials.filter(m => m.remaining_quantity > 0);
  const getRawMaterialName = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    const rawMaterial = rawMaterials.find(r => r.id === material?.raw_material_id);
    return rawMaterial?.name || 'Unknown';
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Production Batch</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Batch Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input 
                  id="batch_number" 
                  value={formData.batch_number} 
                  onChange={(e) => handleChange('batch_number', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="production_date">Production Date</Label>
                <Input 
                  id="production_date" 
                  type="date" 
                  value={formData.production_date} 
                  onChange={(e) => handleChange('production_date', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="output_litres">Output (Litres)</Label>
                <Input 
                  id="output_litres" 
                  type="number" 
                  step="0.1"
                  value={formData.output_litres} 
                  onChange={(e) => handleChange('output_litres', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="quality_notes">Quality Notes</Label>
                <Textarea 
                  id="quality_notes" 
                  value={formData.quality_notes} 
                  onChange={(e) => handleChange('quality_notes', e.target.value)} 
                  placeholder="Quality assessment, color, texture, aroma notes..."
                />
              </div>
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
                    <Select 
                      value={input.material_intake_id} 
                      onValueChange={(value) => updateInput(index, 'material_intake_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMaterials.map(material => (
                          <SelectItem key={material.id} value={material.id}>
                            {getRawMaterialName(material.id)} - {material.remaining_quantity} kg @ ₹{material.cost_per_unit}/kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Quantity (kg)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={input.quantity_used}
                      onChange={(e) => updateInput(index, 'quantity_used', e.target.value)}
                      placeholder="0.0"
                    />
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
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={selectedInputs.length === 0}
            >
              Create Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
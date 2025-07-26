import { useState, useEffect } from 'react';
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
import { Select } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { format } from 'date-fns';
import { Plus, X, AlertTriangle, CheckCircle, Info, Edit2 } from 'lucide-react';
import { InventoryService, type MaterialBatch, type BatchValidationResult } from '@/lib/inventory';
import { toast } from '@/lib/toast';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { AddCustomerModal } from '@/components/ui/AddCustomerModal';
import CustomerService from '@/services/CustomerService';

interface Customer {
  id: string;
  name: string;
  customer_type: string;
}

interface Batch {
  id: string;
  batch_number: string;
  remaining_quantity?: number;
  output_litres?: number;
  lot_number?: string;
}

interface OrderItem {
  batch_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  packaging_type: string;
  validation?: BatchValidationResult | null;
  availableBatches?: MaterialBatch[];
}

interface OrderFormProps {
  customers: Customer[];
  batches: Batch[];
  onSave: (orderData: any) => void;
  onCancel: () => void;
}

export default function OrderForm({ customers: initialCustomers, batches, onSave, onCancel }: OrderFormProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery: '',
    status: 'pending',
    payment_status: 'pending',
    discount_amount: 0,
    notes: ''
  });

  // Local customers state so we can append new ones created from modal
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // Keep local customers list in sync when parent prop changes (e.g., refresh)
  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{
    batch_id: '',
    product_name: '',
    quantity: '',
    unit_price: '',
    packaging_type: '500ml_jar',
    validation: null,
    availableBatches: []
  }]);

  const [availableBatches, setAvailableBatches] = useState<Record<string, MaterialBatch[]>>({});
  const [batchValidations, setBatchValidations] = useState<Record<number, BatchValidationResult | null>>({});
  const [isValidatingBatch, setIsValidatingBatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  // Load available batches for a material
  const loadAvailableBatches = async (materialId: string): Promise<MaterialBatch[]> => {
    try {
      const batches = await InventoryService.getAvailableBatches(materialId);
      setAvailableBatches(prev => ({
        ...prev,
        [materialId]: batches
      }));
      return batches;
    } catch (error) {
      console.error('Failed to load available batches:', error);
      toast.error('Failed to load available batches. Please try again.');
      return [];
    }
  };

  // Validate batch selection
  const validateBatchSelection = async (itemIndex: number, batchId: string, quantity: string | number): Promise<void> => {
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    
    if (!batchId || !quantity || numQuantity <= 0) {
      setBatchValidations(prev => ({
        ...prev,
        [itemIndex]: null
      }));
      return;
    }

    setIsValidatingBatch(true);
    try {
      const validation = await InventoryService.validateBatchSelection(batchId, numQuantity);
      setBatchValidations(prev => ({
        ...prev,
        [itemIndex]: validation
      }));

      // Update the item with validation result
      setOrderItems(prev => 
        prev.map((item, i) => 
          i === itemIndex 
            ? { ...item, validation } 
            : item
        )
      );
    } catch (error) {
      console.error('Batch validation failed:', error);
      setBatchValidations(prev => ({
        ...prev,
        [itemIndex]: {
          isValid: false,
          message: 'Validation failed',
          availableQuantity: 0
        }
      }));
    } finally {
      setIsValidatingBatch(false);
    }
  };

  // Check if all items have valid batch selections
  const hasValidBatchSelections = (): boolean => {
    return orderItems.every((item, index) => {
      if (!item.batch_id || !item.quantity) return false;
      const validation = batchValidations[index];
      return validation && validation.isValid;
    });
  };

  const handleChange = (field: string, value: string | number): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = (): void => {
    setOrderItems(prev => [...prev, {
      batch_id: '',
      product_name: '',
      quantity: '',
      unit_price: '',
      packaging_type: '500ml_jar',
      validation: null,
      availableBatches: []
    }]);
  };

  const removeItem = (index: number): void => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
    // Clean up validation for removed item
    setBatchValidations(prev => {
      const newValidations = { ...prev };
      delete newValidations[index];
      // Reindex remaining validations
      const reindexed: Record<number, BatchValidationResult | null> = {};
      Object.entries(newValidations).forEach(([key, value]) => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = value;
        } else if (oldIndex < index) {
          reindexed[oldIndex] = value;
        }
      });
      return reindexed;
    });
  };

  const updateItem = async (index: number, field: keyof OrderItem, value: string): Promise<void> => {
    setOrderItems(prev => 
      prev.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );

    // Trigger validation when batch or quantity changes
    if (field === 'batch_id' || field === 'quantity') {
      const currentItem = orderItems[index];
      const batchId = field === 'batch_id' ? value : currentItem.batch_id;
      const quantity = field === 'quantity' ? value : currentItem.quantity;
      
      if (batchId && quantity) {
        await validateBatchSelection(index, batchId, quantity);
      }
    }
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
    }, 0);
    
    const discount = typeof formData.discount_amount === 'string' ? parseFloat(formData.discount_amount) : formData.discount_amount || 0;
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.18; // 18% GST
    const total = taxableAmount + tax;
    
    return { subtotal, discount, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      const items = orderItems.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
      }));

      const orderData = {
        ...formData,
        total_amount: subtotal,
        tax_amount: tax,
        net_amount: total,
        items
      };

      // Call the parent's onSave handler which uses OrderService for atomic order/invoice creation
      await onSave(orderData);
    } catch (error) {
      console.error('Order submission error:', error);
      // Error handling is done in OrderService, but we can add UI feedback here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for adding a new customer
  async function handleAddCustomer(data: Customer) {
    const newCustomer = await CustomerService.create(data);
    setCustomers(prev => [...prev, newCustomer]);
    setFormData(prev => ({ ...prev, customer_id: newCustomer.id }));
    setShowAddCustomerModal(false);
  }

  // Handler for editing a customer
  async function handleEditCustomer(data: Customer) {
    const updatedCustomer = await CustomerService.update(data.id, data);
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setFormData(prev => ({ ...prev, customer_id: updatedCustomer.id }));
    setEditCustomer(null);
  }

  // Clear validation error when customer selected
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (formData.customer_id && errors.customer_id) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr.customer_id;
        return newErr;
      });
    }
  }, [formData.customer_id, errors.customer_id]);

  const { subtotal, discount, tax, total } = calculateTotals();

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Customer Order</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Information */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer</Label>
                <div className="flex items-center gap-2">
                  <CreatableCombobox
                    options={customers}
                    value={customers.find(c => c.id === formData.customer_id)}
                    onSelect={customer => setFormData(prev => ({ ...prev, customer_id: customer.id }))}
                    onCreate={() => setShowAddCustomerModal(true)}
                    displayField="name"
                    placeholder="Select or add customer..."
                    createLabel="+ Add new customer"
                  />
                  {formData.customer_id && (
                    <button
                      type="button"
                      className="ml-2 p-1 rounded hover:bg-amber-100"
                      onClick={() => setEditCustomer(customers.find(c => c.id === formData.customer_id))}
                      title="Edit customer"
                    >
                      <Edit2 className="w-4 h-4 text-amber-600" />
                    </button>
                  )}
                </div>
                <AddCustomerModal
                  open={showAddCustomerModal || !!editCustomer}
                  onClose={() => { setShowAddCustomerModal(false); setEditCustomer(null); }}
                  onSave={editCustomer ? handleEditCustomer : handleAddCustomer}
                  initialData={editCustomer || undefined}
                  isEdit={!!editCustomer}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_date">Order Date</Label>
                <Input 
                  id="order_date" 
                  type="date" 
                  value={formData.order_date} 
                  onChange={(e) => handleChange('order_date', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_delivery">Expected Delivery</Label>
                <Input 
                  id="expected_delivery" 
                  type="date" 
                  value={formData.expected_delivery} 
                  onChange={(e) => handleChange('expected_delivery', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                <Input 
                  id="discount_amount" 
                  type="number" 
                  step="0.01"
                  value={formData.discount_amount} 
                  onChange={(e) => handleChange('discount_amount', e.target.value)} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={(e) => handleChange('notes', e.target.value)} 
                  placeholder="Special instructions, delivery notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="border-amber-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Order Items</CardTitle>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Guidance when there are no available production batches */}
              {batches.length === 0 && (
                <Alert className="border-amber-200 bg-amber-50 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <AlertDescription className="text-amber-800">
                    No completed production batches with available inventory were found. Please create a production batch in the “Production” section before creating an order.
                  </AlertDescription>
                </Alert>
              )}

              {orderItems.map((item, index) => {
                const validation = batchValidations[index];
                const selectedBatch = batches.find(b => b.id === item.batch_id);
                
                return (
                  <div key={index} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-amber-50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor={`product_name_${index}`}>Product Name</Label>
                        <Input 
                          id={`product_name_${index}`}
                          value={item.product_name}
                          onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                          placeholder="GSR Ghee 500ml"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Batch
                          {selectedBatch && (
                            <Badge variant="outline" className="text-xs">
                              Available: {selectedBatch.remaining_quantity || selectedBatch.output_litres}L
                            </Badge>
                          )}
                        </Label>
                        {(() => {
                          const availableBatches = batches.filter((batch: Batch) => (batch.remaining_quantity ?? batch.output_litres ?? 0) > 0);
                          const hasOptions = availableBatches.length > 0;
                          return (
                            <Select
                              value={item.batch_id}
                              onChange={(e) => updateItem(index, 'batch_id', e.target.value)}
                              className={validation && !validation.isValid ? 'border-red-300' : ''}
                              aria-label="Batch"
                              disabled={!hasOptions}
                            >
                              <option value="">{hasOptions ? 'Select batch' : 'No batches available'}</option>
                              {availableBatches.map((batch: Batch) => (
                                <option key={batch.id} value={batch.id}>
                                  {batch.batch_number} {batch.remaining_quantity || batch.output_litres}L available
                                </option>
                              ))}
                            </Select>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label>Packaging</Label>
                        <Select 
                          value={item.packaging_type} 
                          onChange={(e) => updateItem(index, 'packaging_type', e.target.value)}
                          aria-label="Packaging"
                        >
                          <option value="500ml_jar">500ml Jar</option>
                          <option value="1000ml_jar">1000ml Jar</option>
                          <option value="250ml_jar">250ml Jar</option>
                          <option value="bulk">Bulk</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity_${index}`} className="flex items-center gap-2">
                          Quantity
                          {isValidatingBatch && <Info className="w-3 h-3 animate-spin" />}
                        </Label>
                        <Input 
                          id={`quantity_${index}`}
                          type="number" 
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                          className={validation && !validation.isValid ? 'border-red-300' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`unit_price_${index}`}>Unit Price (₹)</Label>
                        <Input 
                          id={`unit_price_${index}`}
                          type="number" 
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          onClick={() => removeItem(index)} 
                          variant="outline" 
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Batch Validation Feedback */}
                    {validation && (
                      <Alert className={validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <div className="flex items-center gap-2">
                          {validation.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <AlertDescription className={validation.isValid ? 'text-green-700' : 'text-red-700'}>
                            {validation.message}
                            {validation.availableQuantity > 0 && !validation.isValid && (
                              <span className="block mt-1 text-sm">
                                Available quantity: {validation.availableQuantity} units
                              </span>
                            )}
                          </AlertDescription>
                        </div>
                        
                        {/* Suggested Alternative Batches */}
                        {validation.suggestedBatches && validation.suggestedBatches.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-amber-700 mb-2">Alternative batches:</p>
                            <div className="flex flex-wrap gap-2">
                              {validation.suggestedBatches.map(suggestedBatch => (
                                <Button
                                  key={suggestedBatch.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateItem(index, 'batch_id', suggestedBatch.id)}
                                  className="text-xs"
                                >
                                  {suggestedBatch.lot_number} ({suggestedBatch.remaining_quantity} available)
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </Alert>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-amber-700 font-medium">Subtotal</p>
                  <p className="text-xl font-bold text-gray-900">₹{subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Discount</p>
                  <p className="text-xl font-bold text-gray-900">₹{discount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Tax (18%)</p>
                  <p className="text-xl font-bold text-gray-900">₹{tax.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">₹{total.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={orderItems.length === 0 || !formData.customer_id || !hasValidBatchSelections() || isSubmitting}
            >
              {isSubmitting ? 'Creating Order & Invoice...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
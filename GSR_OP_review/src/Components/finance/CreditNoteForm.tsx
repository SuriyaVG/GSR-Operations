import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, Info, Receipt, DollarSign } from 'lucide-react';
import { useOrderManagement } from '@/lib/hooks/useOrderManagement';
import { User, UserRole } from '@/Entities/User';
import { toast } from '@/lib/toast';
import { creditNoteSchema, validateWithSchema } from '@/lib/validationSchemas';

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  customer_name?: string;
}

interface CreditNoteFormData {
  invoice_id: string;
  amount: string;
  reason: string;
  issue_date: string;
  notes: string;
}

interface CreditNoteFormProps {
  invoice?: Invoice;
  invoices?: Invoice[];
  onSave: (creditNoteData: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export default function CreditNoteForm({ 
  invoice, 
  invoices = [], 
  onSave, 
  onCancel, 
  isOpen 
}: CreditNoteFormProps) {
  const [formData, setFormData] = useState<CreditNoteFormData>({
    invoice_id: invoice?.invoice_id || '',
    amount: '',
    reason: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(invoice || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { canManageFinances } = useOrderManagement();
  const currentUser = User.getCurrentUser();
  const requiresApproval = currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.FINANCE;

  // Update selected invoice when invoice_id changes
  useEffect(() => {
    if (formData.invoice_id) {
      const found = invoices.find(inv => inv.invoice_id === formData.invoice_id);
      setSelectedInvoice(found || null);
    } else {
      setSelectedInvoice(null);
    }
  }, [formData.invoice_id, invoices]);

  // Initialize form with provided invoice
  useEffect(() => {
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        invoice_id: invoice.invoice_id
      }));
      setSelectedInvoice(invoice);
    }
  }, [invoice]);

  const handleChange = (field: string, value: string | number): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    // Use Zod schema for validation
    const dataToValidate = {
      invoice_id: formData.invoice_id,
      amount: parseFloat(formData.amount) || 0,
      reason: formData.reason,
      issue_date: formData.issue_date
    };

    const result = validateWithSchema(creditNoteSchema, dataToValidate);
    
    if (!result.success && result.errors) {
      setValidationErrors(result.errors);
      return false;
    }

    // Additional validation for amount not exceeding outstanding balance
    if (selectedInvoice && parseFloat(formData.amount) > selectedInvoice.outstanding_amount) {
      setValidationErrors({
        ...result.errors || {},
        amount: `Amount cannot exceed outstanding balance of ₹${selectedInvoice.outstanding_amount.toFixed(2)}`
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageFinances) {
      toast.error('You do not have permission to create credit notes');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const creditNoteData = {
        invoice_id: formData.invoice_id,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        issue_date: formData.issue_date,
        notes: formData.notes,
        requires_approval: requiresApproval,
        created_by: currentUser?.id || 'unknown'
      };

      await onSave(creditNoteData);
      
      // Reset form
      setFormData({
        invoice_id: '',
        amount: '',
        reason: '',
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      setSelectedInvoice(null);
      
    } catch (error) {
      console.error('Failed to create credit note:', error);
      // Error handling is done in the onSave function
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMaxAmount = (): number => {
    return selectedInvoice ? selectedInvoice.outstanding_amount : 0;
  };

  const getReasonOptions = () => [
    'Product return',
    'Damaged goods',
    'Billing error',
    'Discount adjustment',
    'Order cancellation',
    'Quality issue',
    'Customer complaint',
    'Other'
  ];

  if (!canManageFinances) {
    return (
      <Dialog open={isOpen} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border-amber-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Access Denied</DialogTitle>
          </DialogHeader>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              You do not have permission to create credit notes. Please contact your administrator.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={onCancel} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-600" />
            Create Credit Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Selection */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-600" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!invoice && (
                <div className="space-y-2">
                  <Label htmlFor="invoice_id">Select Invoice</Label>
                  <Select 
                    value={formData.invoice_id} 
                    onValueChange={(value) => handleChange('invoice_id', value)}
                  >
                    <SelectTrigger 
                      id="invoice_id"
                      className={validationErrors.invoice_id ? 'border-red-300' : ''}
                    >
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices
                        .filter(inv => inv.outstanding_amount > 0)
                        .map((inv) => (
                          <SelectItem key={inv.invoice_id} value={inv.invoice_id}>
                            {inv.invoice_number} - ₹{inv.outstanding_amount.toFixed(2)} outstanding
                            {inv.customer_name && ` (${inv.customer_name})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.invoice_id && (
                    <p className="text-sm text-red-600">{validationErrors.invoice_id}</p>
                  )}
                </div>
              )}

              {selectedInvoice && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-amber-700">Invoice Number</p>
                      <p className="text-gray-900">{selectedInvoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Total Amount</p>
                      <p className="text-gray-900">₹{selectedInvoice.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Paid Amount</p>
                      <p className="text-gray-900">₹{selectedInvoice.paid_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Outstanding</p>
                      <p className="text-lg font-bold text-gray-900">₹{selectedInvoice.outstanding_amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={selectedInvoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {selectedInvoice.status}
                    </Badge>
                    {selectedInvoice.customer_name && (
                      <Badge variant="outline">{selectedInvoice.customer_name}</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Note Details */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Credit Note Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Credit Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  max={getMaxAmount()}
                  value={formData.amount} 
                  onChange={(e) => handleChange('amount', e.target.value)} 
                  placeholder="0.00"
                  className={validationErrors.amount ? 'border-red-300' : ''}
                  aria-invalid={!!validationErrors.amount}
                  aria-describedby={validationErrors.amount ? "amount-error" : undefined}
                />
                {validationErrors.amount && (
                  <p id="amount-error" className="text-sm text-red-600">{validationErrors.amount}</p>
                )}
                {selectedInvoice && (
                  <p className="text-xs text-amber-600">
                    Maximum: ₹{selectedInvoice.outstanding_amount.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input 
                  id="issue_date" 
                  type="date" 
                  value={formData.issue_date} 
                  onChange={(e) => handleChange('issue_date', e.target.value)} 
                  className={validationErrors.issue_date ? 'border-red-300' : ''}
                  aria-invalid={!!validationErrors.issue_date}
                  aria-describedby={validationErrors.issue_date ? "issue-date-error" : undefined}
                />
                {validationErrors.issue_date && (
                  <p id="issue-date-error" className="text-sm text-red-600">{validationErrors.issue_date}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Select 
                  value={formData.reason} 
                  onValueChange={(value) => handleChange('reason', value)}
                >
                  <SelectTrigger 
                    id="reason"
                    className={validationErrors.reason ? 'border-red-300' : ''}
                    aria-invalid={!!validationErrors.reason}
                    aria-describedby={validationErrors.reason ? "reason-error" : undefined}
                  >
                    <SelectValue placeholder="Select reason for credit note" />
                  </SelectTrigger>
                  <SelectContent>
                    {getReasonOptions().map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.reason && (
                  <p id="reason-error" className="text-sm text-red-600">{validationErrors.reason}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={(e) => handleChange('notes', e.target.value)} 
                  placeholder="Additional details about the credit note..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Approval Notice */}
          {requiresApproval && (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                This credit note will require approval from a Finance Manager or Administrator before it can be applied.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={isSubmitting || !selectedInvoice}
            >
              {isSubmitting ? 'Creating...' : 'Submit Credit Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
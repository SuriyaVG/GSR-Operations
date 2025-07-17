import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Plus, Receipt, FileText, TrendingUp } from 'lucide-react';
import CreditNoteForm from './CreditNoteForm';
import CreditNoteList from './CreditNoteList';
import { FinancialService } from '@/lib/financial';
import { useOrderManagement } from '@/lib/hooks/useOrderManagement';
import { toast } from '@/lib/toast';

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

interface CreditNoteManagerProps {
  customerId?: string;
}

export default function CreditNoteManager({ customerId }: CreditNoteManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [statistics, setStatistics] = useState({
    totalCreditNotes: 0,
    totalAmount: 0,
    pendingApproval: 0,
    appliedThisMonth: 0
  });

  const { createCreditNote, canManageFinances } = useOrderManagement();

  useEffect(() => {
    loadInvoices();
    loadStatistics();
  }, [customerId]);

  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const agingData = await FinancialService.getInvoiceAging(customerId);
      const outstandingInvoices = agingData.filter(inv => inv.outstanding_amount > 0);
      setInvoices(outstandingInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const loadStatistics = async () => {
    try {
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      setStatistics({
        totalCreditNotes: 12,
        totalAmount: 45000,
        pendingApproval: 3,
        appliedThisMonth: 8
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleCreateCreditNote = async (creditNoteData: any) => {
    try {
      await createCreditNote(
        creditNoteData.invoice_id,
        creditNoteData.amount,
        creditNoteData.reason
      );
      
      setIsFormOpen(false);
      setSelectedInvoice(null);
      
      // Refresh data
      await loadInvoices();
      await loadStatistics();
      
    } catch (error) {
      // Error handling is done in the createCreditNote function
      throw error;
    }
  };

  const handleCreateFromInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleApprove = async (creditNoteId: string) => {
    try {
      // Refresh statistics after approval
      await loadStatistics();
      toast.success('Credit note approved successfully');
    } catch (error) {
      console.error('Failed to approve credit note:', error);
    }
  };

  const handleReject = async (creditNoteId: string) => {
    try {
      // Refresh statistics after rejection
      await loadStatistics();
      toast.success('Credit note rejected');
    } catch (error) {
      console.error('Failed to reject credit note:', error);
    }
  };

  if (!canManageFinances) {
    return (
      <Card className="border-amber-200">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            You do not have permission to manage credit notes.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Total Credit Notes</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalCreditNotes}</p>
              </div>
              <Receipt className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{statistics.totalAmount.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.pendingApproval}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Applied This Month</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.appliedThisMonth}</p>
              </div>
              <Receipt className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="credit-notes" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
            <TabsTrigger value="invoices">Outstanding Invoices</TabsTrigger>
          </TabsList>
          
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Credit Note
          </Button>
        </div>

        <TabsContent value="credit-notes" className="space-y-4">
          <CreditNoteList
            customerId={customerId}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="text-center text-gray-500 py-8">
                  Loading invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No outstanding invoices found
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.invoice_id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {invoice.invoice_number}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ₹{invoice.outstanding_amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">Outstanding</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateFromInvoice(invoice)}
                        className="ml-4"
                      >
                        Create Credit Note
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credit Note Form Modal */}
      <CreditNoteForm
        isOpen={isFormOpen}
        invoice={selectedInvoice}
        invoices={invoices}
        onSave={handleCreateCreditNote}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { 
  Receipt, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  FileText,
  Eye,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { FinancialService } from '@/lib/financial';
import { toast } from '@/lib/toast';
import { ListSkeleton } from '@/Components/ui/skeleton';
import { User, AuthorizationService, UserRole } from '@/Entities/all';
import type { CreditNote } from '@/Entities/all';

interface CreditNoteWithDetails extends CreditNote {
  invoice_number?: string;
  customer_name?: string;
  issue_date: string; // Added this field to match usage in the component
}

interface CreditNoteListProps {
  customerId?: string;
  onViewDetails?: (creditNote: CreditNoteWithDetails) => void;
  onApprove?: (creditNoteId: string) => void;
  onReject?: (creditNoteId: string) => void;
}

export default function CreditNoteList({ 
  customerId, 
  onViewDetails, 
  onApprove, 
  onReject 
}: CreditNoteListProps) {
  const [creditNotes, setCreditNotes] = useState<CreditNoteWithDetails[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<CreditNoteWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const currentUser = User.getCurrentUser();
  const canApprove = currentUser ? AuthorizationService.hasRole(currentUser, [UserRole.ADMIN, UserRole.FINANCE]) : false;
  const canView = currentUser ? AuthorizationService.hasPermission(currentUser, 'credit_note', 'read') : false;

  useEffect(() => {
    loadCreditNotes();
  }, [customerId]);

  useEffect(() => {
    filterCreditNotes();
  }, [creditNotes, searchTerm, statusFilter]);

  const loadCreditNotes = async () => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // In a real implementation, this would fetch from the API
      // For now, we'll create mock data
      const mockNotes: CreditNoteWithDetails[] = [
        {
          id: '1',
          credit_note_number: 'CN-001',
          customer_id: '1',
          amount: 1500,
          total_amount: 1500,
          reason: 'Product return',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: '1',
          invoice_number: 'INV-1234',
          customer_name: 'ABC Company',
          issue_date: new Date().toISOString()
        },
        {
          id: '2',
          credit_note_number: 'CN-002',
          customer_id: '2',
          amount: 2500,
          total_amount: 2500,
          reason: 'Overcharge correction',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: '1',
          invoice_number: 'INV-5678',
          customer_name: 'XYZ Ltd',
          issue_date: new Date().toISOString()
        }
      ];
      
      setCreditNotes(mockNotes);
    } catch (error) {
      console.error('Failed to load credit notes:', error);
      toast.error('Failed to load credit notes');
    } finally {
      setIsLoading(false);
    }
  };

  const filterCreditNotes = () => {
    let filtered = creditNotes;

    // Filter by customer if specified
    if (customerId) {
      filtered = filtered.filter(note => note.customer_id === customerId);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.credit_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(note => note.status === statusFilter);
    }

    setFilteredNotes(filtered);
  };

  const handleApprove = async (creditNoteId: string) => {
    if (!canApprove) {
      toast.error('You do not have permission to approve credit notes');
      return;
    }

    setIsProcessing(creditNoteId);
    try {
      // In a real implementation, this would update the credit note status
      await FinancialService.applyCreditNote(creditNoteId);
      
      // Update local state
      setCreditNotes(prev => 
        prev.map(note => 
          note.id === creditNoteId 
            ? { ...note, status: 'approved' as const, updated_at: new Date().toISOString() }
            : note
        )
      );

      if (onApprove) {
        onApprove(creditNoteId);
      }

      toast.success('Credit note approved and applied successfully');
    } catch (error) {
      console.error('Failed to approve credit note:', error);
      toast.error('Failed to approve credit note');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (creditNoteId: string) => {
    if (!canApprove) {
      toast.error('You do not have permission to reject credit notes');
      return;
    }

    setIsProcessing(creditNoteId);
    try {
      // Update local state (in real implementation, would call API)
      setCreditNotes(prev => 
        prev.map(note => 
          note.id === creditNoteId 
            ? { ...note, status: 'rejected' as const, updated_at: new Date().toISOString() }
            : note
        )
      );

      if (onReject) {
        onReject(creditNoteId);
      }

      toast.success('Credit note rejected');
    } catch (error) {
      console.error('Failed to reject credit note:', error);
      toast.error('Failed to reject credit note');
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-amber-100 text-amber-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="default" className="bg-red-100 text-red-700">Rejected</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-green-100 text-green-700">Applied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'approved':
        return <Check className="w-4 h-4 text-amber-500" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-500" />;
      case 'applied':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!canView) {
    return (
      <Card className="border-amber-200">
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <X className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              You do not have permission to view credit notes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-600" />
            Credit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by credit note number, reason, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 bg-white w-40"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="applied">Applied</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Notes List */}
      {isLoading ? (
        <ListSkeleton rows={5} showSearch={false} showTabs={false} />
      ) : filteredNotes.length === 0 ? (
        <Card className="border-amber-200">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No credit notes match your filters' 
                : 'No credit notes found'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="border-amber-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(note.status)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {note.credit_note_number}
                      </h3>
                      {getStatusBadge(note.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-amber-700">Invoice</p>
                        <p className="text-gray-900">{note.invoice_number}</p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-700">Amount</p>
                        <p className="text-lg font-bold text-gray-900">₹{note.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-700">Issue Date</p>
                        <p className="text-gray-900">{format(new Date(note.issue_date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="font-medium text-amber-700 text-sm">Reason</p>
                      <p className="text-gray-900">{note.reason}</p>
                    </div>

                    {note.customer_name && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {note.customer_name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(note)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    )}

                    {canApprove && note.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(note.id)}
                          disabled={isProcessing === note.id}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                          {isProcessing === note.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(note.id)}
                          disabled={isProcessing === note.id}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
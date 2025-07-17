// src/lib/financial.ts
import { Invoice } from '@/Entities/Invoice';
import { CreditNote } from '@/Entities/CreditNote';
import { FinancialLedger } from '@/Entities/FinancialLedger';
import { Order } from '@/Entities/Order';
import { Customer } from '@/Entities/Customer';
import { User } from '@/Entities/User';
import { toast } from '@/lib/toast';

export interface InvoiceCreationData {
  order_id: string;
  payment_terms?: number;
  due_date?: string;
}

export interface CreditNoteCreationData {
  invoice_id: string;
  amount: number;
  reason: string;
}

export interface PaymentData {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string;
}

export class FinancialService {
  // Generate invoice number
  private static async generateInvoiceNumber(): Promise<string> {
    const invoices = await Invoice.list();
    const year = new Date().getFullYear();
    const sequence = invoices.length + 1;
    return `INV-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  // Generate credit note number
  private static async generateCreditNoteNumber(): Promise<string> {
    const creditNotes = await CreditNote.list();
    const year = new Date().getFullYear();
    const sequence = creditNotes.length + 1;
    return `CN-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  // Create invoice from order
  static async createInvoiceFromOrder(data: InvoiceCreationData): Promise<Invoice> {
    try {
      // Get order details
      const order = await Order.find(data.order_id);
      if (!order) {
        throw new Error('Order not found');
      }

      // Get customer details for payment terms
      const customer = await Customer.find(order.customer_id);
      const paymentTerms = data.payment_terms || customer?.payment_terms || 30;

      // Calculate due date
      const issueDate = new Date();
      const dueDate = data.due_date ? new Date(data.due_date) : new Date(issueDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice
      const invoice = await Invoice.create({
        order_id: data.order_id,
        invoice_number: invoiceNumber,
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        total_amount: order.total_amount,
        paid_amount: 0,
        status: 'draft',
        payment_terms: paymentTerms,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Create financial ledger entry
      await this.createLedgerEntry({
        transaction_type: 'invoice',
        reference_id: invoice.id,
        reference_type: 'invoice',
        customer_id: order.customer_id,
        amount: order.total_amount, // Positive for debit (amount owed)
        description: `Invoice ${invoiceNumber} for Order ${order.order_number || order.id}`,
        transaction_date: issueDate.toISOString()
      });

      toast.success(`Invoice ${invoiceNumber} created successfully`);
      return invoice;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create invoice';
      toast.error(message);
      throw error;
    }
  }

  // Create credit note
  static async createCreditNote(data: CreditNoteCreationData): Promise<CreditNote> {
    try {
      // Get invoice details
      const invoice = await Invoice.find(data.invoice_id);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Validate credit note amount
      if (data.amount <= 0) {
        throw new Error('Credit note amount must be positive');
      }

      if (data.amount > invoice.total_amount - invoice.paid_amount) {
        throw new Error('Credit note amount cannot exceed outstanding invoice amount');
      }

      // Get order and customer details
      const order = await Order.find(invoice.order_id);
      if (!order) {
        throw new Error('Related order not found');
      }

      // Generate credit note number
      const creditNoteNumber = await this.generateCreditNoteNumber();

      // Create credit note
      const creditNote = await CreditNote.create({
        invoice_id: data.invoice_id,
        credit_note_number: creditNoteNumber,
        issue_date: new Date().toISOString(),
        amount: data.amount,
        reason: data.reason,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Create financial ledger entry (negative amount for credit)
      await this.createLedgerEntry({
        transaction_type: 'credit_note',
        reference_id: creditNote.id,
        reference_type: 'credit_note',
        customer_id: order.customer_id,
        amount: -data.amount, // Negative for credit
        description: `Credit Note ${creditNoteNumber} - ${data.reason}`,
        transaction_date: new Date().toISOString()
      });

      toast.success(`Credit Note ${creditNoteNumber} created successfully`);
      return creditNote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create credit note';
      toast.error(message);
      throw error;
    }
  }

  // Record payment
  static async recordPayment(data: PaymentData): Promise<void> {
    try {
      // Get invoice details
      const invoice = await Invoice.find(data.invoice_id);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Validate payment amount
      if (data.amount <= 0) {
        throw new Error('Payment amount must be positive');
      }

      const outstandingAmount = invoice.total_amount - invoice.paid_amount;
      if (data.amount > outstandingAmount) {
        throw new Error('Payment amount cannot exceed outstanding balance');
      }

      // Get order details
      const order = await Order.find(invoice.order_id);
      if (!order) {
        throw new Error('Related order not found');
      }

      // Update invoice paid amount
      const newPaidAmount = invoice.paid_amount + data.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 
                       newPaidAmount > 0 ? 'sent' : invoice.status;

      // Update invoice (this would be a real update in a proper implementation)
      // For now, we'll simulate by creating a new version
      const updatedInvoice = {
        ...invoice,
        paid_amount: newPaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Create financial ledger entry for payment (negative amount for credit)
      await this.createLedgerEntry({
        transaction_type: 'payment',
        reference_id: data.invoice_id,
        reference_type: 'payment',
        customer_id: order.customer_id,
        amount: -data.amount, // Negative for credit (payment received)
        description: `Payment received for Invoice ${invoice.invoice_number}${data.reference ? ` - Ref: ${data.reference}` : ''}`,
        transaction_date: data.payment_date
      });

      toast.success(`Payment of $${data.amount.toFixed(2)} recorded successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record payment';
      toast.error(message);
      throw error;
    }
  }

  // Create financial ledger entry
  private static async createLedgerEntry(data: Omit<FinancialLedger, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<FinancialLedger> {
    const currentUser = User.getCurrentUser();
    const userId = currentUser?.id || 'system';

    return await FinancialLedger.create({
      ...data,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Get customer balance
  static async getCustomerBalance(customerId: string): Promise<number> {
    const ledgerEntries = await FinancialLedger.filter({ customer_id: customerId });
    return ledgerEntries.reduce((balance, entry) => balance + entry.amount, 0);
  }

  // Get invoice aging data
  static async getInvoiceAging(customerId?: string): Promise<any[]> {
    let invoices = await Invoice.list();
    
    if (customerId) {
      // Filter by customer through orders
      const customerOrders = await Order.filter({ customer_id: customerId });
      const customerOrderIds = customerOrders.map(order => order.id);
      invoices = invoices.filter(invoice => customerOrderIds.includes(invoice.order_id));
    }

    const now = new Date();
    
    return invoices.map(invoice => {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const outstandingAmount = invoice.total_amount - invoice.paid_amount;
      
      let agingBucket: string;
      if (daysOverdue <= 0) {
        agingBucket = 'current';
      } else if (daysOverdue <= 30) {
        agingBucket = '0-30';
      } else if (daysOverdue <= 60) {
        agingBucket = '31-60';
      } else if (daysOverdue <= 90) {
        agingBucket = '61-90';
      } else {
        agingBucket = '90+';
      }

      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        paid_amount: invoice.paid_amount,
        outstanding_amount: outstandingAmount,
        days_overdue: daysOverdue,
        aging_bucket: agingBucket,
        status: invoice.status
      };
    });
  }

  // Apply credit note to invoice
  static async applyCreditNote(creditNoteId: string): Promise<void> {
    try {
      const creditNote = await CreditNote.find(creditNoteId);
      if (!creditNote) {
        throw new Error('Credit note not found');
      }

      if (creditNote.status === 'applied') {
        throw new Error('Credit note has already been applied');
      }

      // Update credit note status (simulated)
      const updatedCreditNote = {
        ...creditNote,
        status: 'applied' as const,
        updated_at: new Date().toISOString()
      };

      toast.success(`Credit Note ${creditNote.credit_note_number} applied successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply credit note';
      toast.error(message);
      throw error;
    }
  }

  // Get financial summary for a customer
  static async getCustomerFinancialSummary(customerId: string): Promise<{
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalCreditNotes: number;
    currentBalance: number;
  }> {
    // Get all orders for customer
    const orders = await Order.filter({ customer_id: customerId });
    const orderIds = orders.map(order => order.id);

    // Get all invoices for customer orders
    const allInvoices = await Invoice.list();
    const customerInvoices = allInvoices.filter(invoice => orderIds.includes(invoice.order_id));

    // Get all credit notes for customer invoices
    const allCreditNotes = await CreditNote.list();
    const customerCreditNotes = allCreditNotes.filter(cn => 
      customerInvoices.some(inv => inv.id === cn.invoice_id)
    );

    const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    const totalCreditNotes = customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);
    const currentBalance = await this.getCustomerBalance(customerId);

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalCreditNotes,
      currentBalance
    };
  }
}
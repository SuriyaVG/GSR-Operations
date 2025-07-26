// src/Entities/all.ts
// This file exports all entity types and classes from a single location

// Export interfaces (types)
export type { 
  CreditNote as CreditNoteInterface, 
  CreditNoteItem, 
  CreditNoteCreationData, 
  CreditNoteUpdateData 
} from './CreditNote';
export type { 
  Invoice as InvoiceInterface, 
  InvoiceItem, 
  InvoiceCreationData, 
  InvoiceUpdateData 
} from './Invoice';
export type { 
  Order as OrderInterface, 
  OrderItem, 
  OrderCreationData, 
  OrderUpdateData 
} from './Order';
export type { 
  Customer as CustomerInterface, 
  CustomerCreationData, 
  CustomerUpdateData 
} from './Customer';
export type { 
  FinancialLedger as FinancialLedgerInterface, 
  FinancialLedgerCreationData, 
  FinancialLedgerUpdateData 
} from './FinancialLedger';

// Export entity classes (values)
export { CreditNote } from './CreditNote';
export { Invoice } from './Invoice';
export { Order } from './Order';
export { Customer } from './Customer';
export { FinancialLedger } from './FinancialLedger';

// Export User entity (both types and values)
export { User, UserRole, AuthorizationService } from './User';
export type { Permission } from './User';

// Re-export interfaces with original names for backward compatibility
export type { 
  CreditNoteInterface as CreditNote,
  InvoiceInterface as Invoice,
  OrderInterface as Order,
  CustomerInterface as Customer,
  FinancialLedgerInterface as FinancialLedger
};
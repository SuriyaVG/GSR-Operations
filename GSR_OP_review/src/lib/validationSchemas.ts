import { z } from 'zod';

// Common validation helpers
const positiveNumber = (message = "Must be a positive number") => 
  z.number().positive(message);

const nonNegativeNumber = (message = "Cannot be negative") => 
  z.number().min(0, message);

const requiredString = (message = "This field is required") => 
  z.string().min(1, message);

const optionalString = z.string().optional();

const dateString = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  { message: "Invalid date format" }
);

// Material Intake Form Schema
export const materialIntakeSchema = z.object({
  supplier_id: requiredString("Please select a supplier"),
  raw_material_id: requiredString("Please select a raw material"),
  quantity: z.number()
    .positive("Quantity must be greater than zero")
    .max(100000, "Quantity cannot exceed 100,000 units"),
  cost_per_unit: z.number()
    .positive("Cost per unit must be greater than zero")
    .max(10000, "Cost per unit cannot exceed ₹10,000"),
  lot_number: optionalString,
  intake_date: dateString,
  expiry_date: z.string().optional().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    { message: "Invalid expiry date format" }
  ),
  quality_notes: z.string().max(500, "Quality notes cannot exceed 500 characters").optional(),
}).refine(
  (data) => {
    if (data.expiry_date && data.intake_date) {
      return new Date(data.expiry_date) > new Date(data.intake_date);
    }
    return true;
  },
  {
    message: "Expiry date must be after intake date",
    path: ["expiry_date"]
  }
);

// Production Batch Input Schema
export const productionInputSchema = z.object({
  material_intake_id: requiredString("Please select a material"),
  quantity_used: z.number()
    .positive("Quantity used must be greater than zero")
    .max(10000, "Quantity used cannot exceed 10,000 kg")
});

// Production Form Schema
export const productionBatchSchema = z.object({
  batch_number: requiredString("Batch number is required")
    .min(3, "Batch number must be at least 3 characters")
    .max(50, "Batch number cannot exceed 50 characters"),
  production_date: dateString,
  output_litres: z.number()
    .positive("Output must be greater than zero")
    .max(50000, "Output cannot exceed 50,000 litres"),
  quality_notes: z.string().max(1000, "Quality notes cannot exceed 1000 characters").optional(),
  status: z.enum(['in_progress', 'completed', 'quality_check', 'approved'], {
    errorMap: () => ({ message: "Please select a valid status" })
  }),
  inputs: z.array(productionInputSchema)
    .min(1, "At least one input material is required")
    .max(20, "Cannot have more than 20 input materials")
}).refine(
  (data) => {
    const today = new Date();
    const productionDate = new Date(data.production_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    return productionDate >= oneYearAgo && productionDate <= today;
  },
  {
    message: "Production date must be within the last year and not in the future",
    path: ["production_date"]
  }
);

// Order Item Schema
export const orderItemSchema = z.object({
  batch_id: requiredString("Please select a batch"),
  quantity: z.number()
    .positive("Quantity must be greater than zero")
    .max(10000, "Quantity cannot exceed 10,000 litres"),
  unit_price: z.number()
    .positive("Unit price must be greater than zero")
    .max(1000, "Unit price cannot exceed ₹1,000 per litre")
});

// Order Form Schema
export const orderSchema = z.object({
  customer_id: requiredString("Please select a customer"),
  order_date: dateString,
  delivery_date: z.string().optional().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    { message: "Invalid delivery date format" }
  ),
  status: z.enum(['draft', 'confirmed', 'in_production', 'ready', 'dispatched', 'delivered'], {
    errorMap: () => ({ message: "Please select a valid status" })
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  items: z.array(orderItemSchema)
    .min(1, "At least one order item is required")
    .max(50, "Cannot have more than 50 order items")
}).refine(
  (data) => {
    if (data.delivery_date && data.order_date) {
      return new Date(data.delivery_date) >= new Date(data.order_date);
    }
    return true;
  },
  {
    message: "Delivery date must be on or after order date",
    path: ["delivery_date"]
  }
);

// Credit Note Schema
export const creditNoteSchema = z.object({
  invoice_id: requiredString("Please select an invoice"),
  amount: z.number()
    .positive("Amount must be greater than zero")
    .max(1000000, "Amount cannot exceed ₹10,00,000"),
  reason: requiredString("Please provide a reason for the credit note")
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason cannot exceed 500 characters"),
  issue_date: dateString
});

// User Profile Schema
export const userProfileSchema = z.object({
  name: requiredString("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters"),
  phone: z.string()
    .regex(/^[+]?[\d\s\-\(\)]{10,15}$/, "Please enter a valid phone number")
    .optional(),
  department: optionalString,
  designation: optionalString,
  role: z.enum(['admin', 'production', 'sales_manager', 'finance', 'viewer'], {
    errorMap: () => ({ message: "Please select a valid role" })
  })
});

// Customer Schema
export const customerSchema = z.object({
  name: requiredString("Customer name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .optional(),
  phone: z.string()
    .regex(/^[+]?[\d\s\-\(\)]{10,15}$/, "Please enter a valid phone number"),
  address: z.string()
    .max(500, "Address cannot exceed 500 characters")
    .optional(),
  gst_number: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST number")
    .optional(),
  credit_limit: nonNegativeNumber("Credit limit cannot be negative").optional(),
  payment_terms: z.string().max(100, "Payment terms cannot exceed 100 characters").optional()
});

// Supplier Schema
export const supplierSchema = z.object({
  name: requiredString("Supplier name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  contact_person: z.string()
    .max(100, "Contact person name cannot exceed 100 characters")
    .optional(),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .optional(),
  phone: z.string()
    .regex(/^[+]?[\d\s\-\(\)]{10,15}$/, "Please enter a valid phone number"),
  address: z.string()
    .max(500, "Address cannot exceed 500 characters")
    .optional(),
  gst_number: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST number")
    .optional(),
  payment_terms: z.string().max(100, "Payment terms cannot exceed 100 characters").optional()
});

// Raw Material Schema
export const rawMaterialSchema = z.object({
  name: requiredString("Material name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  unit: requiredString("Unit is required")
    .max(20, "Unit cannot exceed 20 characters"),
  description: z.string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  minimum_stock_level: nonNegativeNumber("Minimum stock level cannot be negative").optional()
});

// Form validation helper types
export type MaterialIntakeFormData = z.infer<typeof materialIntakeSchema>;
export type ProductionBatchFormData = z.infer<typeof productionBatchSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type CreditNoteFormData = z.infer<typeof creditNoteSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export type RawMaterialFormData = z.infer<typeof rawMaterialSchema>;

// Validation helper function
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
      }
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

// Real-time validation helper for individual fields
export function validateField<T>(schema: z.ZodSchema<T>, fieldPath: string, value: unknown, fullData?: Partial<T>): string | undefined {
  try {
    // For nested field validation, we need to validate the full object
    if (fieldPath.includes('.')) {
      const testData = { ...fullData } as any;
      const pathParts = fieldPath.split('.');
      let current = testData;
      
      // Set the value at the nested path
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      current[pathParts[pathParts.length - 1]] = value;
      
      schema.parse(testData);
    } else {
      // For simple field validation, create a minimal object
      const testData = { ...fullData, [fieldPath]: value } as any;
      schema.parse(testData);
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
      const fieldError = error.errors.find(err => 
        err.path.join('.') === fieldPath
      );
      return fieldError?.message;
    }
    return 'Validation error';
  }
}
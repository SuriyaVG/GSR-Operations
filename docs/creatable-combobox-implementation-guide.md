# Creatable Combobox & Master Data Management Guide

## Overview
This guide explains how to implement modern, user-friendly master data management in ERP forms—allowing users to add, update, and select suppliers, raw materials, customers, etc., directly from the UI. The approach preserves the existing design system (glassy cards, amber/orange theme, Tailwind, Radix UI) and ensures seamless integration.

---

## 1. Why Creatable Comboboxes?
- **Visual Comparison:**

```txt
Standard <Select>:
+----------------------+
| Supplier ▼           |
+----------------------+
| Glass Jar Industries |
| Acme Corp            |
| ...                  |
+----------------------+

Creatable Combobox:
+----------------------+
| Supplier ▼           |
+----------------------+
| Glass Jar Industries |
| Acme Corp            |
|----------------------|
| + Add "New Supplier" |
+----------------------+
(Filter as you type; 'Add' appears if no match)
```

---

## 2. UX Patterns & Best Practices
- **Creatable Combobox:**
  - Users can type to filter options.
  - If no match, show an "Add 'X'" option.
  - On selecting "Add", open a modal or inline form for required details.
  - After adding, the new entry appears in the dropdown and is auto-selected.
- **Add New Button:**
  - Next to dropdown, a "+" or "Add New" button opens a modal for full data entry.
- **Update Option:**
  - In dropdown or list, provide an "Edit" icon/button to update existing entries (opens modal with pre-filled data).
- **Consistent Styling:**
  - Use existing card, modal, button, and input components.
  - Maintain glassy, amber/orange theme and rounded corners.

---

## 3. Implementation Steps

### A. Creatable Combobox Component
- **Folder Structure:**
```txt
src/
└── components/
    └── ui/
        └── creatable-combobox.tsx
```
Scaffold your new component here for consistency.

---

### B. Add/Edit Modal
- **Example Zod Schema:**
```ts
import { z } from 'zod';
const SupplierSchema = z.object({
  name: z.string().min(1, 'Required'),
  contactEmail: z.string().email(),
});
```

---

### C. Integration in Forms
- Replace supplier/raw material dropdowns in Material Intake, Production, etc., with the creatable combobox.
- Pass current options, and implement `onCreate` to open the add modal.
- After adding, refresh options and auto-select the new entry.

### D. API/Service Layer
- Ensure you have service functions for creating and updating master data (e.g., `SupplierService.create`, `RawMaterialService.update`).
- Use optimistic UI updates for best UX.

---

## 4. Design System Alignment
- **Use existing UI primitives:**
  - Modal: `Dialog`, `DialogContent`, `DialogHeader`, etc.
  - Inputs: `Input`, `Select`, `Textarea`, etc.
  - Buttons: Use amber/orange theme, rounded corners, shadow.
- **Spacing & Typography:**
  - Follow Tailwind spacing and font classes.
- **Feedback:**
  - Use toast notifications for success/error.
  - Show inline validation errors.

---

## 5. Example Usage
- **onCreate Logic:**
```ts
async function handleAddSupplier(data) {
  const newSupplier = await SupplierService.create(data);
  setSuppliers(prev => [...prev, newSupplier]);
  setSelectedSupplier(newSupplier);
}
```

---

## 6. Updating Existing Entries
- In the combobox or a separate list/table, provide an edit button/icon.
- Open the same modal with pre-filled data for editing.
- On save, update the entry and refresh options.

---

## 7. Accessibility & Mobile
- Ensure all modals and comboboxes are keyboard accessible.
- Use responsive layouts for modals/forms.

---

## 8. Error Handling
- **Toast/Error Boundary Integration:**
```ts
try {
  // ...create or update logic
} catch (err) {
  toast.error(err.message);
}
```
- For critical errors, wrap your modal or form in a React error boundary for fallback UI.

---

## 9. Summary Tables

### Data Actions
| Action        | UI Element         | Pattern                |
|---------------|--------------------|------------------------|
| Add New       | Creatable combobox | Modal or inline form   |
| Edit Existing | Edit icon/button   | Modal with pre-fill    |

### Styling & Validation
| Feature           | Pattern/Component         |
|-------------------|--------------------------|
| Consistent Look   | Card, modal, input       |
| Theme             | Glassy, amber/orange     |
| Validation        | Inline, toast, Zod       |
| Feedback          | toast.error, error state |

---

## 10. References
- [react-select Creatable](https://react-select.com/creatable)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Tailwind UI Forms](https://tailwindui.com/components/application-ui/forms/overview)

---

**By following this guide, you can make your ERP app truly user-friendly and production-ready, allowing users to manage master data seamlessly without leaving their workflow.** 
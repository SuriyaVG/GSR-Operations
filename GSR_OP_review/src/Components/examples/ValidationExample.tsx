import * as React from "react"
import { ValidatedForm, FormField, ValidatedInput, ValidatedTextarea } from "../ui/validated-form"
import { commonRules, validators } from "@/lib/validation"
import { Card } from "../ui/card"
import { useToast } from "../ui/toast"
import { Button } from "../ui/button"

interface OrderFormData {
  customerName: string
  quantity: number
  unitPrice: number
  totalCost: number
  description: string
}

export function ValidationExample() {
  const { success, error, warning, info } = useToast()
  
  const initialValues: OrderFormData = {
    customerName: "",
    quantity: 0,
    unitPrice: 0,
    totalCost: 0,
    description: ""
  }

  const validationRules = {
    customerName: commonRules.name,
    quantity: commonRules.quantity,
    unitPrice: commonRules.unitPrice,
    totalCost: {
      required: true,
      custom: validators.cost("Total cost must be greater than zero")
    },
    description: commonRules.description
  }

  const handleSubmit = async (data: OrderFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log("Form submitted:", data)
  }

  const showToastExamples = () => {
    success("This is a success message!")
    setTimeout(() => error("This is an error message!"), 500)
    setTimeout(() => warning("This is a warning message!"), 1000)
    setTimeout(() => info("This is an info message!"), 1500)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Form Example</h2>
        
        <ValidatedForm
          initialValues={initialValues}
          validationRules={validationRules}
          onSubmit={handleSubmit}
          successMessage="Order created successfully!"
          errorMessage="Failed to create order. Please try again."
        >
          {({ getFieldProps, isSubmitting }) => (
            <>
              <FormField
                label="Customer Name"
                required
                error={getFieldProps('customerName').error}
              >
                <ValidatedInput
                  {...getFieldProps('customerName')}
                  placeholder="Enter customer name"
                  error={getFieldProps('customerName').error}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Quantity"
                  required
                  error={getFieldProps('quantity').error}
                >
                  <ValidatedInput
                    {...getFieldProps('quantity')}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter quantity"
                    error={getFieldProps('quantity').error}
                  />
                </FormField>

                <FormField
                  label="Unit Price"
                  required
                  error={getFieldProps('unitPrice').error}
                >
                  <ValidatedInput
                    {...getFieldProps('unitPrice')}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter unit price"
                    error={getFieldProps('unitPrice').error}
                  />
                </FormField>
              </div>

              <FormField
                label="Total Cost"
                required
                error={getFieldProps('totalCost').error}
              >
                <ValidatedInput
                  {...getFieldProps('totalCost')}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter total cost"
                  error={getFieldProps('totalCost').error}
                />
              </FormField>

              <FormField
                label="Description"
                error={getFieldProps('description').error}
              >
                <ValidatedTextarea
                  {...getFieldProps('description')}
                  placeholder="Enter order description (optional)"
                  error={getFieldProps('description').error}
                />
              </FormField>
            </>
          )}
        </ValidatedForm>
      </Card>

      {/* Toast Notification Demo */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Toast Notification Demo</h3>
        <p className="text-gray-600 mb-4">
          Click the button below to see all toast notification types in action:
        </p>
        <Button 
          onClick={showToastExamples}
          className="bg-amber-400 hover:bg-amber-500 text-white"
        >
          Show Toast Examples
        </Button>
      </Card>

      {/* Validation Features Info */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Validation Features</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span><strong>Zero/Negative Prevention:</strong> Quantity and cost fields prevent zero or negative values</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span><strong>Real-time Validation:</strong> Fields validate on blur by default</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span><strong>Form-level Validation:</strong> Submit button is disabled until all fields are valid</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span><strong>Toast Notifications:</strong> Success and error messages for form submissions</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span><strong>Accessible Design:</strong> Proper ARIA attributes and error associations</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
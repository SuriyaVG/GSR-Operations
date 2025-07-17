import * as React from "react"
import { Check, ChevronDown, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"

export interface CreatableComboboxOption {
  value: string
  label: string
  [key: string]: any
}

export interface CreatableComboboxProps<T extends CreatableComboboxOption> {
  options: T[]
  value?: T
  onSelect: (value: T) => void
  onCreate: (newValue: string) => Promise<T>
  displayField?: keyof T
  placeholder?: string
  createLabel?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function CreatableCombobox<T extends CreatableComboboxOption>({
  options,
  value,
  onSelect,
  onCreate,
  displayField = "label" as keyof T,
  placeholder = "Select an option...",
  createLabel = "+ Add new",
  searchPlaceholder = "Search...",
  disabled = false,
  className
}: CreatableComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [newItemValue, setNewItemValue] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const createInputRef = React.useRef<HTMLInputElement>(null)
  const optionsListRef = React.useRef<HTMLDivElement>(null)

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter(option =>
      String(option[displayField]).toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue, displayField])

  // Handle option selection
  const handleSelect = (option: T) => {
    onSelect(option)
    setOpen(false)
    setSearchValue("")
  }

  // Handle create new item
  const handleCreate = async () => {
    if (!newItemValue.trim()) return
    
    setIsCreating(true)
    try {
      const newOption = await onCreate(newItemValue.trim())
      onSelect(newOption)
      setShowCreateModal(false)
      setNewItemValue("")
      setOpen(false)
    } catch (error) {
      console.error("Failed to create new item:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return

    switch (event.key) {
      case "Escape":
        event.preventDefault()
        setOpen(false)
        setSearchValue("")
        setHighlightedIndex(-1)
        break
      case "ArrowDown":
        event.preventDefault()
        setHighlightedIndex(prev => {
          const maxIndex = filteredOptions.length // includes create option
          return prev < maxIndex ? prev + 1 : 0
        })
        break
      case "ArrowUp":
        event.preventDefault()
        setHighlightedIndex(prev => {
          const maxIndex = filteredOptions.length // includes create option
          return prev > 0 ? prev - 1 : maxIndex
        })
        break
      case "Enter":
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          // Select highlighted option
          handleSelect(filteredOptions[highlightedIndex])
        } else if (highlightedIndex === filteredOptions.length || (filteredOptions.length === 0 && searchValue)) {
          // Create new option
          setNewItemValue(searchValue)
          setShowCreateModal(true)
        }
        break
      case "Tab":
        setOpen(false)
        setSearchValue("")
        setHighlightedIndex(-1)
        break
    }
  }

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredOptions])

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  // Focus create input when modal opens
  React.useEffect(() => {
    if (showCreateModal && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [showCreateModal])

  return (
    <>
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? "combobox-options" : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
              ? `option-${filteredOptions[highlightedIndex].value}`
              : highlightedIndex === filteredOptions.length
              ? "create-option"
              : undefined
          }
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-white border-amber-200 hover:bg-amber-50 hover:border-amber-300",
            !value && "text-gray-500"
          )}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
              e.preventDefault()
              setOpen(true)
            }
          }}
        >
          <span className="truncate">
            {value ? String(value[displayField]) : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-amber-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-amber-100">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8 border-amber-200 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Options List */}
            <div 
              id="combobox-options"
              ref={optionsListRef}
              className="max-h-40 overflow-y-auto"
              role="listbox"
              aria-label="Options"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    id={`option-${option.value}`}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm focus:bg-amber-50 focus:outline-none flex items-center justify-between",
                      value?.value === option.value && "bg-amber-100",
                      highlightedIndex === index && "bg-amber-50"
                    )}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={value?.value === option.value}
                    tabIndex={-1}
                  >
                    <span className="truncate">{String(option[displayField])}</span>
                    {value?.value === option.value && (
                      <Check className="h-4 w-4 text-amber-600" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500" role="status">
                  No options found
                </div>
              )}
            </div>

            {/* Create New Option */}
            <div className="border-t border-amber-100">
              <button
                id="create-option"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm focus:bg-amber-50 focus:outline-none flex items-center text-amber-600 font-medium",
                  highlightedIndex === filteredOptions.length && "bg-amber-50"
                )}
                onClick={() => {
                  setNewItemValue(searchValue)
                  setShowCreateModal(true)
                }}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                role="button"
                aria-label={`Create new item${searchValue ? ` "${searchValue}"` : ''}`}
                tabIndex={-1}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createLabel}
                {searchValue && (
                  <span className="ml-1 text-gray-600">"{searchValue}"</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false)
              setSearchValue("")
            }}
          />
        )}
      </div>

      {/* Create New Item Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>
              Enter a name for the new item you want to create.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-item" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <Input
                id="new-item"
                ref={createInputRef}
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                placeholder="Enter name..."
                className="border-amber-200 focus:border-amber-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setNewItemValue("")
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newItemValue.trim() || isCreating}
              className="bg-amber-400 hover:bg-amber-500 text-white"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
import React, { useState, useRef } from 'react';

interface CreatableComboboxProps<T> {
  options: T[];
  value?: T;
  onSelect: (value: T) => void;
  onCreate: (input: string) => void;
  displayField: keyof T;
  placeholder?: string;
  createLabel?: string;
  label?: string;
}

export function CreatableCombobox<T extends { [key: string]: any }>({
  options,
  value,
  onSelect,
  onCreate,
  displayField,
  placeholder = 'Select...',
  createLabel = '+ Add',
  label,
}: CreatableComboboxProps<T>) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Synchronize input state with value prop
  React.useEffect(() => {
    // Only update input if value exists and its display field is different from current input
    if (value && String(value[displayField]) !== input) {
      setInput(String(value[displayField]));
    }
    // When value is cleared (e.g., initial render or reset), clear input too
    if (!value && input !== '') {
      setInput('');
    }
  }, [value, displayField]);

  const filtered = input
    ? options.filter(opt =>
        String(opt[displayField]).toLowerCase().includes(input.toLowerCase())
      )
    : options;

  const showAdd = input && !filtered.some(opt => String(opt[displayField]).toLowerCase() === input.toLowerCase());
  const totalOptions = filtered.length + (showAdd ? 1 : 0);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      setHighlighted(0);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => (h + 1) % totalOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => (h - 1 + totalOptions) % totalOptions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < filtered.length) {
        onSelect(filtered[highlighted]);
        setInput(String(filtered[highlighted][displayField]));
        setOpen(false);
      } else if (showAdd && highlighted === filtered.length) {
        onCreate(input);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (open && listRef.current && highlighted >= 0) {
      const el = listRef.current.querySelectorAll('[role="option"]')[highlighted] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  return (
    <div className="relative">
      {label && <label className="block mb-1 text-sm font-medium">{label}</label>}
      <input
        ref={inputRef}
        className="border border-amber-200 rounded-lg px-3 py-2 w-full focus:border-amber-400 focus:ring-1 focus:ring-amber-500"
        placeholder={placeholder}
        value={input}
        aria-label={label || placeholder}
        onChange={e => {
          setInput(e.target.value);
          setOpen(true);
          setHighlighted(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? 'combobox-listbox' : undefined}
        aria-activedescendant={open && highlighted >= 0 ? `option-${highlighted}` : undefined}
      />
      {open && (
        <div
          ref={listRef}
          id="combobox-listbox"
          role="listbox"
          className="absolute z-10 bg-white border border-amber-200 rounded-lg shadow-lg mt-1 w-full max-h-60 overflow-auto"
        >
          {filtered.map((opt, i) => (
            <div
              key={opt[displayField]}
              id={`option-${i}`}
              role="option"
              aria-selected={value && value[displayField] === opt[displayField]}
              className={`px-4 py-2 cursor-pointer hover:bg-amber-50 ${
                value && value[displayField] === opt[displayField] ? 'bg-amber-100' : ''
              } ${highlighted === i ? 'bg-amber-200 text-white' : ''}`}
              tabIndex={-1}
              onMouseDown={() => {
                onSelect(opt);
                setInput(String(opt[displayField]));
                setOpen(false);
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {opt[displayField]}
            </div>
          ))}
          {showAdd && (
            <div
              id={`option-${filtered.length}`}
              role="option"
              aria-selected={highlighted === filtered.length}
              className={`px-4 py-2 cursor-pointer text-amber-600 hover:bg-amber-50 border-t border-amber-100 ${
                highlighted === filtered.length ? 'bg-amber-200 text-white' : ''
              }`}
              tabIndex={-1}
              onMouseDown={() => {
                onCreate(input);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlighted(filtered.length)}
            >
              {createLabel} "{input}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React from 'react';

export const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="block w-full rounded-md border border-amber-200 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-500 focus:ring-1" {...props}>
    {children}
  </select>
);

export const SelectTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="relative" {...props}>{children}</div>
);

export const SelectContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="absolute z-10 mt-1 w-full bg-white border border-amber-200 rounded-md shadow-lg" {...props}>{children}</div>
);

export const SelectItem = ({ children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) => (
  <option {...props}>{children}</option>
);

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span className="text-gray-500">{placeholder}</span>
); 
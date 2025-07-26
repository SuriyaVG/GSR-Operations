import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`block w-full rounded-md border border-amber-200 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-500 focus:ring-1 ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export default Input; 
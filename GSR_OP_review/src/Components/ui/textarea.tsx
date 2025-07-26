import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`block w-full rounded-md border border-amber-200 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:ring-amber-500 focus:ring-1 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export default Textarea; 
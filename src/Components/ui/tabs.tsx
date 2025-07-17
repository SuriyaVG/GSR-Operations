import React, { useState, type ReactNode } from 'react';

export const Tabs = ({ defaultValue, children, className = '' }: { defaultValue: string; children: ReactNode; className?: string }) => {
  const [active, setActive] = useState(defaultValue);
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TabsList) {
          return React.cloneElement(child, { active, setActive });
        }
        if (React.isValidElement(child) && child.type === TabsContent) {
          return React.cloneElement(child, { active });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ children, active, setActive, className = '' }: any) => (
  <div className={`flex ${className}`}>
    {React.Children.map(children, child =>
      React.isValidElement(child)
        ? React.cloneElement(child, { active, setActive })
        : child
    )}
  </div>
);

export const TabsTrigger = ({ value, children, active, setActive, className = '' }: any) => (
  <button
    className={`px-4 py-2 rounded-t ${active === value ? 'bg-amber-100 text-amber-800' : 'bg-white text-gray-700'} ${className}`}
    onClick={() => setActive(value)}
    type="button"
  >
    {children}
  </button>
);

export const TabsContent = ({ value, children, active, className = '' }: any) => (
  active === value ? <div className={className}>{children}</div> : null
); 
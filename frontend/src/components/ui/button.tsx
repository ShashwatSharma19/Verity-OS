import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap
        ${disabled
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-slate-900 text-white hover:bg-slate-700 cursor-pointer'
        } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

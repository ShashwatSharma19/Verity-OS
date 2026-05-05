import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`flex-1 px-3 py-2 text-sm rounded-md border border-slate-200
        bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2
        focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50
        disabled:text-slate-400 w-full ${className}`}
      {...props}
    />
  );
}

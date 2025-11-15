import React from 'react';

export function Badge({ children, className = "", variant }) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2";
  let variantClasses = "border-transparent bg-slate-100 text-slate-900"; 
  if (variant === "outline") variantClasses = "text-slate-200 bg-slate-900/80 border-slate-700";

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`}>
      {children}
    </div>
  );
}
import React from 'react';

export function Button({ children, className = "", variant, size, onClick, ...props }) {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  let sizeClasses = "h-10 py-2 px-4";
  if (size === "icon") sizeClasses = "h-10 w-10 p-0";
  let variantClasses = "bg-white text-slate-900 hover:bg-slate-100";
  if (variant === "ghost") variantClasses = "hover:bg-slate-800/50 hover:text-white text-slate-300";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
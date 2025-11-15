import React, { useState } from 'react';

// Simplificação: Usa estado local para controlar a visibilidade,
// simulando o comportamento de bibliotecas complexas como Radix.

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)} // Fecha ao clicar no overlay
    >
      {children}
    </div>
  );
}

export function DialogContent({ className = "", children, ...props }) {
  return (
    <div
      className={`bg-slate-900 border-slate-700 rounded-lg p-6 w-full max-w-lg shadow-2xl transition-all scale-100 opacity-100`}
      onClick={(e) => e.stopPropagation()} // Impede que o clique interno feche o modal
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className = "", ...props }) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
      {...props}
    />
  );
}

export function DialogTitle({ className = "", ...props }) {
  return (
    <h2
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({ className = "", ...props }) {
  return (
    <p
      className={`text-sm text-muted-foreground ${className}`}
      {...props}
    />
  );
}
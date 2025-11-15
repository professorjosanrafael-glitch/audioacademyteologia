import React, { useState } from 'react';

// Componente simples para simular o comportamento de Tabs
export function Tabs({ defaultValue, children, className = "", ...props }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  // Clona os filhos e injeta o estado para a lista e conteúdo
  const renderChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      if (child.type === TabsList) {
        return React.cloneElement(child, { activeTab, setActiveTab });
      }
      if (child.type === TabsContent) {
        return React.cloneElement(child, { activeTab });
      }
    }
    return child;
  });

  return (
    <div className={className} {...props}>
      {renderChildren}
    </div>
  );
}

export function TabsList({ children, activeTab, setActiveTab, className = "", ...props }) {
  const renderChildren = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === TabsTrigger) {
      return React.cloneElement(child, { 
        activeTab, 
        onClick: () => setActiveTab(child.props.value) 
      });
    }
    return child;
  });
  
  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      {renderChildren}
    </div>
  );
}

export function TabsTrigger({ children, value, activeTab, onClick, className = "", ...props }) {
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={onClick}
      data-state={isActive ? "active" : "inactive"}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        isActive 
          ? "bg-slate-800 text-white" 
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, activeTab, className = "", ...props }) {
  if (activeTab !== value) return null;
  
  return (
    <div 
      data-state={activeTab === value ? "active" : "inactive"}
      className={className} 
      {...props}
    >
      {children}
    </div>
  );
}
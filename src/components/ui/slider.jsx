import React, { useState, useEffect } from 'react';

// ATENÇÃO: Esta é uma simulação simples de um slider usando Input Range, 
// pois bibliotecas de slider são complexas. Ela cumpre o mínimo necessário.
export function Slider({ value, max, min = 0, step = 1, onValueChange, className = "", ...props }) {
  const [localValue, setLocalValue] = useState(value[0] || min);

  useEffect(() => {
    setLocalValue(value[0]);
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    if (onValueChange) {
      onValueChange([newValue]);
    }
  };

  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className={`relative h-5 w-full ${className}`} {...props}>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue}
            onChange={handleChange}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
            style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${percentage}%, #334155 ${percentage}%, #334155 100%)`
            }}
        />
    </div>
  );
}
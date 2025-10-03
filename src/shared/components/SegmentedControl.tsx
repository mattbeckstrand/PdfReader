import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented ${className ?? ''}`.trim()} role="tablist" aria-label="View Mode">
      {options.map(opt => (
        <button
          key={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;

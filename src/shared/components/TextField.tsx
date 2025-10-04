import React from 'react';

export interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

export const TextField: React.FC<TextFieldProps> = ({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  icon,
  className,
  disabled = false,
  onKeyPress,
}) => {
  return (
    <div className={`textfield ${className ?? ''}`.trim()}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-1)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && <div className="icon">{icon}</div>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          onKeyPress={onKeyPress}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '15px',
            border: '1px solid var(--stroke-1)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: disabled ? 'var(--surface-2)' : 'var(--surface-1)',
            color: 'var(--text-1)',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      </div>
    </div>
  );
};

export default TextField;

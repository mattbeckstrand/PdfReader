import React from 'react';

export interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  value,
  onChange,
  placeholder,
  icon,
  className,
}) => {
  return (
    <div className={`textfield ${className ?? ''}`.trim()}>
      {icon && <div className="icon">{icon}</div>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

export default TextField;

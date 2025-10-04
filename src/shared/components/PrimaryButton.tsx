import React from 'react';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  className,
  title,
  disabled,
  style,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`btn btn-primary ${className ?? ''}`.trim()}
      style={style}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;

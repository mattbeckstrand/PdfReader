import React from 'react';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  className,
  title,
}) => {
  return (
    <button onClick={onClick} title={title} className={`btn btn-primary ${className ?? ''}`.trim()}>
      {children}
    </button>
  );
};

export default PrimaryButton;

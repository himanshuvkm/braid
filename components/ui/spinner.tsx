import React from 'react';
import { Icons } from './icons';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return <Icons.Spinner size={sizeMap[size]} className={className} />;
};

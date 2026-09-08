import React from 'react';
import type { OptionId } from '@/types/quiz';
import { OPTION_CONFIGS } from '@/lib/constants';

interface OptionBadgeProps {
  optionId: OptionId;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OptionBadge({ optionId, label, size = 'md' }: OptionBadgeProps) {
  const config = OPTION_CONFIGS[optionId];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded text-white ${config.tailwindBg} ${sizeClasses}`}
    >
      <span aria-hidden="true">{config.symbol}</span>
      <span>{optionId}</span>
      {label && <span className="font-normal opacity-90">({label})</span>}
    </span>
  );
}

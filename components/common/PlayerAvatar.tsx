import React from 'react';
import Image from 'next/image';
import { avatarSource } from '@/lib/avatars';

export function PlayerAvatar({ avatarId, size = 40, className = '' }: { avatarId?: string; size?: number; className?: string }) {
  return <Image src={avatarSource(avatarId)} alt="" width={size} height={size} unoptimized
    className={`shrink-0 rounded-xl bg-[#232C3E] ${className}`} />;
}

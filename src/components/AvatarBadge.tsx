import { AVATARS } from '../shared/types';

interface AvatarBadgeProps {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-2xl',
  xl: 'w-20 h-20 text-4xl',
};

export function AvatarBadge({
  avatarId,
  size = 'md',
  className = '',
}: AvatarBadgeProps) {
  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-xl flex items-center justify-center font-bold select-none shrink-0 shadow-sm ${className}`}
      style={{ backgroundColor: avatar.bg, color: avatar.fg }}
      title={avatar.label}
      aria-label={`Avatar ${avatar.label}`}
    >
      <span aria-hidden="true">{avatar.symbol}</span>
    </div>
  );
}

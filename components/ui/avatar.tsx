import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: AvatarSize;
  color?: string;
}

const sizeStyles: Record<AvatarSize, { box: string; text: string; iconSize: number }> = {
  xs: { box: 'w-5 h-5 rounded-full', text: 'text-[9px]', iconSize: 10 },
  sm: { box: 'w-6 h-6 rounded-full', text: 'text-[10px]', iconSize: 12 },
  md: { box: 'w-8 h-8 rounded-full', text: 'text-xs', iconSize: 16 },
  lg: { box: 'w-10 h-10 rounded-full', text: 'text-sm font-semibold', iconSize: 20 },
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  size = 'md',
  color,
  className = '',
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const initial = (name ? name.trim().charAt(0) : '?').toUpperCase();
  const config = sizeStyles[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 font-bold select-none overflow-hidden ${
        config.box
      } ${
        color ? '' : 'bg-[#191919] text-[#ffffff]'
      } ${className}`}
      style={color ? { backgroundColor: color, color: '#ffffff' } : undefined}
      title={name}
      {...props}
    >
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className={config.text}>{initial}</span>
      )}
    </div>
  );
};

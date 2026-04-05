import { getInitials } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

export function Avatar({ src, name, size = 'md', className }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium bg-primary/20 text-primary overflow-hidden',
        sizes[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
    </div>
  );
}

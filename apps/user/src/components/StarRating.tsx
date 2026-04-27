import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({ rating, size = 'sm', showValue = true, interactive = false, onChange }: StarRatingProps) {
  const sizeMap = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' };

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={cn(
              sizeMap[size],
              i <= Math.round(rating) ? 'fill-accent text-accent' : 'text-muted-foreground/30',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
            onClick={() => interactive && onChange?.(i)}
          />
        ))}
      </div>
      {showValue && <span className="text-sm font-semibold text-foreground ml-0.5">{rating.toFixed(1)}</span>}
    </div>
  );
}

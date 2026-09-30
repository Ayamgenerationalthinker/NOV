import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-amber-300 hover:bg-amber-200 text-stone-950 font-semibold active:bg-amber-400',
      secondary: 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 active:bg-stone-800',
      outline: 'border border-stone-700 hover:bg-stone-800/80 text-stone-200 active:bg-stone-800',
      ghost: 'hover:bg-stone-800 text-stone-300 hover:text-white',
      danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900/50 active:bg-red-700',
      success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/50 active:bg-emerald-700',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

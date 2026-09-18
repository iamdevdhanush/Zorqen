import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface AntiMetalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'default' | 'compact' | 'icon' | 'full';
  loading?: boolean;
  className?: string;
}

export const AntiMetalButton = forwardRef<HTMLButtonElement, AntiMetalButtonProps>(
  (
    {
      label,
      children,
      icon,
      rightIcon,
      size = 'default',
      loading = false,
      disabled = false,
      type = 'button',
      className = '',
      ...props
    },
    ref
  ) => {
    const content = label ?? children;

    const sizeClasses = {
      default: 'h-[48px] px-6 text-[14px] min-h-[48px]',
      compact: 'h-[38px] px-4 text-[13px] min-h-[38px] anti-metal-compact',
      icon: 'w-10 h-10 min-w-10 min-h-10 p-0 text-[13px] anti-metal-icon',
      full: 'w-full h-[48px] px-6 text-[14px] min-h-[48px]',
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(
          'anti-metal-btn',
          sizeClasses,
          loading && 'cursor-wait',
          className
        )}
        {...props}
      >
        {/* Leading icon or spinner */}
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#C8F31D]" aria-hidden="true" />
        ) : (
          icon && <span className="inline-flex items-center shrink-0" aria-hidden="true">{icon}</span>
        )}

        {/* Text Content */}
        {content && (
          <span className="inline-flex items-center gap-1.5 leading-none tracking-tight">
            {content}
          </span>
        )}

        {/* Trailing icon */}
        {!loading && rightIcon && (
          <span className="inline-flex items-center shrink-0 transition-transform duration-180 group-hover:translate-x-0.5" aria-hidden="true">
            {rightIcon}
          </span>
        )}

        {/* Expanding Neon Lime Accent Strip */}
        <span className="anti-metal-strip" aria-hidden="true" />
      </button>
    );
  }
);

AntiMetalButton.displayName = 'AntiMetalButton';

export default AntiMetalButton;

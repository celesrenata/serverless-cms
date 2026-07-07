import * as React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-theme-primary/10 text-theme-primary border-theme-primary/30',
  success: 'bg-theme-success/10 text-theme-success border-theme-success/30',
  warning: 'bg-theme-warning/10 text-theme-warning border-theme-warning/30',
  error: 'bg-theme-error/10 text-theme-error border-theme-error/30',
  info: 'bg-theme-info/10 text-theme-info border-theme-info/30',
  default: 'bg-theme-surface-alt text-theme-text-muted border-theme-border',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

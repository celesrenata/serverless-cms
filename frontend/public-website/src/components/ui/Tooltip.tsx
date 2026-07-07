import * as React from 'react';

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: React.ReactNode;
  children: React.ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Tooltip = React.forwardRef<HTMLSpanElement, TooltipProps>(
  ({ text, children, className, ...props }, ref) => {
    const tooltipId = React.useId();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleMouseEnter = () => setIsOpen(true);
    const handleMouseLeave = () => setIsOpen(false);
    const handleFocus = () => setIsOpen(true);
    const handleBlur = () => setIsOpen(false);
    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
      <span
        ref={ref}
        tabIndex={0}
        aria-describedby={tooltipId}
        className={cn(
          'relative inline-flex w-fit',
          'focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 rounded',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}

        <span
          id={tooltipId}
          role="tooltip"
          aria-hidden={!isOpen}
          className={cn(
            'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md',
            'bg-theme-surface-alt px-2.5 py-1.5 text-xs font-medium text-theme-text shadow-md border border-theme-border',
            'transition-opacity',
            isOpen ? 'visible opacity-100' : 'invisible opacity-0'
          )}
        >
          {text}
        </span>
      </span>
    );
  }
);

Tooltip.displayName = 'Tooltip';

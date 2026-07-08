import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: string | React.ReactNode;
  children: React.ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ header, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-theme-border bg-theme-surface text-theme-text shadow-sm p-6',
          className
        )}
        {...props}
      >
        {header ? (
          <div className="mb-4 border-b border-theme-border pb-4">
            {typeof header === 'string' ? (
              <h3 className="text-lg font-semibold text-theme-text">{header}</h3>
            ) : (
              header
            )}
          </div>
        ) : null}
        <div>{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

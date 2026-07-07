import * as React from 'react';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: React.ReactNode;
  error?: React.ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      id,
      name,
      type = 'text',
      placeholder,
      disabled = false,
      className,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-theme-text"
        >
          {label}
          {required ? (
            <span className="ml-1 text-theme-error" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'block h-10 w-full rounded-md border bg-theme-surface px-3 py-2 text-sm text-theme-text',
            'border-theme-border placeholder:text-theme-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-theme-error' : undefined,
            className
          )}
          {...props}
        />

        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-theme-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

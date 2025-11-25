import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  success,
  required,
  hint,
  className,
  children,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'text-sm font-medium',
          error ? 'text-red-600' : 'text-gray-700'
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="relative">
        {children}

        {/* Status Icon */}
        {(error || success) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Input with built-in error styling
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500 pr-10',
          className
        )}
        {...props}
      />
    );
  }
);
FormInput.displayName = 'FormInput';

// Textarea with built-in error styling
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

// Form error summary for displaying multiple errors at once
interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({ errors, className }) => {
  const errorEntries = Object.entries(errors).filter(([, message]) => message);

  if (errorEntries.length === 0) return null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h4>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
            {errorEntries.map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Inline validation helper hook
export function useFormValidation<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = (field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const setError = (field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearError = (field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const setFieldTouched = (field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    clearError,
    setFieldTouched,
    clearAllErrors,
    reset,
    hasErrors: Object.keys(errors).length > 0,
  };
}

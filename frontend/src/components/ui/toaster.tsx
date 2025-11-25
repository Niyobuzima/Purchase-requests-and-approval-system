import { useToast, type ToastProps } from './use-toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
}

function Toast({ title, description, variant = 'default' }: ToastProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-lg transition-all',
        variant === 'destructive'
          ? 'border-destructive bg-destructive text-destructive-foreground'
          : 'border bg-background text-foreground'
      )}
    >
      {title && <div className="font-semibold">{title}</div>}
      {description && (
        <div className={cn('text-sm', title && 'mt-1', 'opacity-90')}>{description}</div>
      )}
    </div>
  );
}

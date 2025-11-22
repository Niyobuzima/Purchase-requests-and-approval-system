import { useState, useCallback } from 'react';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type ToastActionType = ToastProps | ((prevToasts: ToastProps[]) => ToastProps[]);

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<ToastProps, 'id'>) => {
    const id = `toast-${toastCount++}`;
    const newToast: ToastProps = { id, title, description, variant };

    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, 3000);

    return id;
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== toastId));
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}

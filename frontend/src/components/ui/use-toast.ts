import { useState, useCallback, useEffect } from 'react';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// type ToastActionType = ToastProps | ((prevToasts: ToastProps[]) => ToastProps[]);

let toastCount = 0;

// Global state for toasts (shared across all components)
let globalToasts: ToastProps[] = [];
let listeners: Array<(toasts: ToastProps[]) => void> = [];

function updateGlobalToasts(toasts: ToastProps[]) {
  globalToasts = toasts;
  listeners.forEach((listener) => listener(toasts));
}

function addGlobalToast(toast: Omit<ToastProps, 'id'>) {
  const id = `toast-${toastCount++}`;
  const newToast: ToastProps = { id, ...toast };
  
  updateGlobalToasts([...globalToasts, newToast]);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    updateGlobalToasts(globalToasts.filter((t) => t.id !== id));
  }, 5000);

  return id;
}

function removeGlobalToast(toastId: string) {
  updateGlobalToasts(globalToasts.filter((t) => t.id !== toastId));
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>(globalToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((listener) => listener !== setToasts);
    };
  }, []);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<ToastProps, 'id'>) => {
    return addGlobalToast({ title, description, variant });
  }, []);

  const dismiss = useCallback((toastId: string) => {
    removeGlobalToast(toastId);
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}

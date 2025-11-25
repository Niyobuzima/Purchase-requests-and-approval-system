import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, Trash2, XCircle } from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'default';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ConfirmationVariant;
  loading?: boolean;
}

const variantStyles: Record<ConfirmationVariant, { icon: React.ReactNode; buttonClass: string }> = {
  danger: {
    icon: <Trash2 className="h-6 w-6 text-red-600" />,
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-600',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-600',
  },
  default: {
    icon: <XCircle className="h-6 w-6 text-gray-600" />,
    buttonClass: '',
  },
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  loading = false,
}) => {
  const { icon, buttonClass } = variantStyles[variant];

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={buttonClass}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Pre-configured confirmation dialogs for common actions
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  onConfirm,
  loading,
}) => (
  <ConfirmationDialog
    open={open}
    onOpenChange={onOpenChange}
    title={`Delete ${itemType}?`}
    description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
    confirmLabel="Delete"
    onConfirm={onConfirm}
    variant="danger"
    loading={loading}
  />
);

interface RejectConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const RejectConfirmationDialog: React.FC<RejectConfirmationDialogProps> = ({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}) => (
  <ConfirmationDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Reject Request?"
    description={`Are you sure you want to reject "${itemName}"? The requester will be notified of your decision.`}
    confirmLabel="Reject"
    onConfirm={onConfirm}
    variant="warning"
    loading={loading}
  />
);

interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export const DiscardChangesDialog: React.FC<DiscardChangesDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => (
  <ConfirmationDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Discard changes?"
    description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
    confirmLabel="Discard"
    onConfirm={onConfirm}
    variant="warning"
  />
);

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'success';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-gray-50 border-gray-200',
    search: 'bg-amber-50 border-amber-200',
    success: 'bg-emerald-50 border-emerald-200',
  };

  const iconStyles = {
    default: 'bg-gray-100 text-gray-500',
    search: 'bg-amber-100 text-amber-600',
    success: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border ${variantStyles[variant]}`}>
      <div className={`rounded-full p-4 mb-4 ${iconStyles[variant]}`}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Pre-configured empty states for common scenarios
export const NoRequestsEmptyState: React.FC<{ onCreateNew?: () => void }> = ({ onCreateNew }) => (
  <EmptyState
    title="No purchase requests"
    description="You haven't created any purchase requests yet. Create your first request to get started."
    action={onCreateNew ? { label: 'Create Request', onClick: onCreateNew } : undefined}
  />
);

export const NoResultsEmptyState: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => (
  <EmptyState
    title="No results found"
    description={searchTerm
      ? `No results match "${searchTerm}". Try adjusting your search or filters.`
      : "No results match your search criteria. Try adjusting your filters."
    }
    variant="search"
  />
);

export const NoPendingApprovalsEmptyState: React.FC = () => (
  <EmptyState
    title="All caught up"
    description="There are no purchase requests waiting for your approval."
    variant="success"
  />
);

export const NoReviewedApprovalsEmptyState: React.FC = () => (
  <EmptyState
    title="No reviewed requests"
    description="You haven't reviewed any requests yet."
  />
);

export const NoPurchaseOrdersEmptyState: React.FC = () => (
  <EmptyState
    title="No purchase orders"
    description="No purchase orders have been generated yet. Purchase orders are created automatically when requests are fully approved."
  />
);

export const NoReceiptsEmptyState: React.FC = () => (
  <EmptyState
    title="No receipts"
    description="No receipts have been uploaded for this purchase order."
  />
);

export const NoUsersEmptyState: React.FC<{ onCreateNew?: () => void }> = ({ onCreateNew }) => (
  <EmptyState
    title="No users found"
    description="No users match the current filters. Try adjusting your search criteria."
    action={onCreateNew ? { label: 'Add User', onClick: onCreateNew } : undefined}
  />
);

export const NoNotificationsEmptyState: React.FC = () => (
  <EmptyState
    title="No notifications"
    description="You're all caught up! Check back later for new notifications."
    variant="success"
  />
);

export default EmptyState;

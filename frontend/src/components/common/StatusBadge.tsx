import React from 'react';
import { FileText, Clock, CheckCircle, XCircle, FileCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          icon: <FileText className="h-4 w-4" />,
          label: 'Draft',
        };
      case 'PENDING':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: <Clock className="h-4 w-4" />,
          label: 'Pending Approval',
        };
      case 'APPROVED_L1':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-300',
          icon: <FileCheck className="h-4 w-4" />,
          label: 'Approved - Level 1',
        };
      case 'APPROVED_L2':
      case 'APPROVED':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Fully Approved',
        };
      case 'REJECTED':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: <XCircle className="h-4 w-4" />,
          label: 'Rejected',
        };
      case 'COMPLETED':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Completed',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          icon: <FileText className="h-4 w-4" />,
          label: status.replace(/_/g, ' '),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} font-medium text-sm ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import type { Approval } from '@/api/approvals';

interface ApprovalTimelineProps {
  approvals: Approval[];
  requestStatus: string;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ approvals, requestStatus }) => {
  const getStatusIcon = (approval: Approval) => {
    if (approval.status === 'APPROVED') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    } else if (approval.status === 'REJECTED') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (approval: Approval) => {
    if (approval.status === 'APPROVED') {
      return 'border-green-500 bg-green-50';
    } else if (approval.status === 'REJECTED') {
      return 'border-red-500 bg-red-50';
    } else {
      return 'border-yellow-500 bg-yellow-50';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  // Sort approvals by level
  const sortedApprovals = [...approvals].sort((a, b) => a.level - b.level);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedApprovals.map((approval, index) => (
            <div key={approval.id} className="relative">
              {/* Connector line */}
              {index < sortedApprovals.length - 1 && (
                <div className="absolute left-[18px] top-10 bottom-[-16px] w-0.5 bg-gray-300" />
              )}

              {/* Timeline item */}
              <div className={`flex items-start space-x-3 p-4 border-l-4 rounded-r-md ${getStatusColor(approval)}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(approval)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Level {approval.level} Approval
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      approval.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : approval.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {approval.status_display}
                    </span>
                  </div>

                  {approval.approver_details && (
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <User className="h-4 w-4 mr-1" />
                      <span>
                        {approval.approver_details.first_name} {approval.approver_details.last_name}
                      </span>
                      <span className="mx-2">•</span>
                      <span className="text-xs">{approval.approver_details.email}</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {approval.processed_at ? (
                      <>
                        Processed {formatRelativeTime(approval.processed_at)}
                        <span className="text-gray-400 ml-1">({formatDate(approval.processed_at)})</span>
                      </>
                    ) : (
                      'Awaiting approval'
                    )}
                  </p>

                  {approval.comments && (
                    <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-sm">
                      <p className="text-gray-600 font-medium mb-1">Comments:</p>
                      <p className="text-gray-800">{approval.comments}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Final status indicator */}
          {requestStatus === 'APPROVED' && (
            <div className="flex items-start space-x-3 p-4 border-l-4 border-green-500 bg-green-50 rounded-r-md">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-900">Fully Approved</h4>
                <p className="text-xs text-green-700">Request has been approved and is ready for processing</p>
              </div>
            </div>
          )}

          {requestStatus === 'REJECTED' && (
            <div className="flex items-start space-x-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-md">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900">Request Rejected</h4>
                <p className="text-xs text-red-700">This request has been rejected and will not be processed</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

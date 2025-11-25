import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import { StatsGridSkeleton, ListSkeleton } from '@/components/common/LoadingSkeletons';
import { NoRequestsEmptyState } from '@/components/common/EmptyState';
import type { PurchaseRequestListItem } from '@/types';
import { Plus, Eye } from 'lucide-react';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PurchaseRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await purchaseRequestsAPI.getMyRequests({
          ordering: '-created_at',
        });
        setRequests(data.results || []);
      } catch (error) {
        const { toastData } = handleAndFormatError(error);
        toast(toastData);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  // Calculate statistics
  const stats = {
    total: requests.length,
    draft: requests.filter((r) => r.status === 'DRAFT').length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    approved: requests.filter(
      (r) => r.status === 'APPROVED' || r.status === 'APPROVED_L1' || r.status === 'APPROVED_L2'
    ).length,
    rejected: requests.filter((r) => r.status === 'REJECTED').length,
    totalAmount: requests.reduce((sum, r) => {
      const amount = typeof r.total_amount === 'number' ? r.total_amount : parseFloat(r.total_amount as string);
      return sum + amount;
    }, 0),
  };

  const recentRequests = requests.slice(0, 5);

  // Status badge with subtle colors
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-600',
      PENDING: 'bg-amber-50 text-amber-700',
      APPROVED_L1: 'bg-blue-50 text-blue-700',
      APPROVED_L2: 'bg-blue-50 text-blue-700',
      APPROVED: 'bg-emerald-50 text-emerald-700',
      REJECTED: 'bg-red-50 text-red-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.DRAFT}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Overview of your purchase requests</p>
          </div>
          <Button onClick={() => navigate('/staff/requests/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="mb-8">
            <StatsGridSkeleton count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-l-4 border-l-gray-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
                <p className="text-xs text-gray-400 mt-1">All time submissions</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.pending}</p>
                <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.approved}</p>
                <p className="text-xs text-gray-400 mt-1">Ready for processing</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(stats.totalAmount)}</p>
                <p className="text-xs text-gray-400 mt-1">Combined request value</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Drafts</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{stats.draft}</p>
              <p className="text-xs text-gray-400 mt-1">Not yet submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Rejected</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{stats.rejected}</p>
              <p className="text-xs text-gray-400 mt-1">Needs revision</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {requests.reduce((sum, r) => sum + r.item_count, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Across all requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Recent Requests</CardTitle>
                <CardDescription>Your latest purchase requests</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/staff/requests')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton items={5} />
            ) : recentRequests.length === 0 ? (
              <NoRequestsEmptyState onCreateNew={() => navigate('/staff/requests/create')} />
            ) : (
              <div className="divide-y">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors"
                    onClick={() => navigate(`/staff/requests/${request.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">PR-{request.id}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-900 mt-1 truncate">{request.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(request.created_at)} · {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(typeof request.total_amount === 'number' ? request.total_amount : parseFloat(request.total_amount as string))}
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1 h-8 text-gray-500">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/staff/requests/create')}
              >
                Create New Request
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/staff/requests')}
              >
                View All Requests
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/staff/purchase-orders')}
              >
                Purchase Orders
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/staff/requests', { state: { filter: 'DRAFT' } })}
              >
                View Drafts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;

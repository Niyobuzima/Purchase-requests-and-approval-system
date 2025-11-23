import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { PurchaseRequestListItem } from '@/types';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Package,
  Eye,
  ShoppingCart,
} from 'lucide-react';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PurchaseRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch requests
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await purchaseRequestsAPI.getMyRequests({
          ordering: '-created_at',
        });
        setRequests(data);
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

  // Get recent requests (last 5)
  const recentRequests = requests.slice(0, 5);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: <FileText className="h-3 w-3" />,
      },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: <Clock className="h-3 w-3" />,
      },
      APPROVED_L1: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      APPROVED_L2: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      APPROVED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      REJECTED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <XCircle className="h-3 w-3" />,
      },
    };

    const badge = badges[status] || badges.DRAFT;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.icon}
        <span>{status.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your purchase requests</p>
          </div>
          <Button onClick={() => navigate('/staff/requests/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-gray-600 mt-1">Successfully approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
              <p className="text-xs text-gray-600 mt-1">All requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {requests.reduce((sum, r) => sum + r.item_count, 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>Your latest purchase requests</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/staff/requests')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading requests...</p>
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first purchase request</p>
                <Button onClick={() => navigate('/staff/requests/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => navigate(`/staff/requests/${request.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-medium text-gray-900">PR-{request.id}</h4>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{request.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Created {formatDate(request.created_at)} • {request.item_count} item
                        {request.item_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center text-lg font-bold text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {typeof request.total_amount === 'number'
                          ? request.total_amount.toFixed(2)
                          : request.total_amount}
                      </div>
                      <Button variant="ghost" size="sm" className="mt-2">
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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => navigate('/staff/requests/create')}
              >
                <Plus className="h-6 w-6" />
                <span>Create New Request</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => navigate('/staff/requests')}
              >
                <FileText className="h-6 w-6" />
                <span>View All Requests</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => navigate('/staff/purchase-orders')}
              >
                <ShoppingCart className="h-6 w-6" />
                <span>Purchase Orders</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => navigate('/staff/requests', { state: { filter: 'DRAFT' } })}
              >
                <Clock className="h-6 w-6" />
                <span>View Drafts</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;

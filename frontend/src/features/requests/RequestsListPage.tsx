import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { PurchaseRequestListItem } from '@/types';
import { Plus, Search, FileText, Clock, CheckCircle2, XCircle, DollarSign, Eye } from 'lucide-react';

const RequestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PurchaseRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    (location.state as { filter?: string })?.filter
  );

  // Fetch requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await purchaseRequestsAPI.getMyRequests({
        search: searchTerm || undefined,
        status: statusFilter,
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRequests();
  }, [statusFilter]); // searchTerm intentionally omitted - fetch triggered on form submit

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  // Get status badge color
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
      COMPLETED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <CheckCircle2 className="h-3 w-3" />,
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
            <h1 className="text-3xl font-bold text-gray-900">My Purchase Requests</h1>
            <p className="text-gray-600 mt-1">View and manage your purchase requests</p>
          </div>
          <Button onClick={() => navigate('/staff/requests/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            {/* Active Filter Badge */}
            {statusFilter && (
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-sm text-gray-600">Filter:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {statusFilter} Status
                  <button
                    onClick={() => setStatusFilter(undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No requests found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first purchase request'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/staff/requests/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Requests Table */}
        {!loading && requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Requests</CardTitle>
              <CardDescription>
                A list of all your purchase requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        PR-{request.id}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium text-gray-900">{request.title}</div>
                        {request.description && (
                          <div className="text-sm text-gray-600 truncate">
                            {request.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end font-semibold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          {typeof request.total_amount === 'number'
                            ? request.total_amount.toFixed(2)
                            : request.total_amount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(request.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {request.submitted_at ? (
                          <span className="text-sm text-gray-600">
                            {formatDate(request.submitted_at)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`/staff/requests/${request.id}`)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RequestsListPage;

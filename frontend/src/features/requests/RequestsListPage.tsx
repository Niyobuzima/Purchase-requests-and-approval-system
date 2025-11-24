import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { handleAndFormatError } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Pagination } from '@/components/common/Pagination';
import type { PurchaseRequestListItem } from '@/types';
import { Plus, Filter, FileText, Clock, CheckCircle2, XCircle, DollarSign, Eye, ArrowUpDown } from 'lucide-react';

const RequestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { filters, setFilter, setFilters, clearFilters, getFilter } = useUrlFilters();

  // Helper to get base path based on user role
  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  const [requests, setRequests] = useState<PurchaseRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Get filter values from URL
  const searchTerm = getFilter('search', '');
  const currentPage = parseInt(getFilter('page', '1'));
  const pageSize = parseInt(getFilter('page_size', '20'));
  const ordering = getFilter('ordering', '-created_at');

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        created_after: filters.created_after || undefined,
        created_before: filters.created_before || undefined,
        amount_min: filters.amount_min || undefined,
        amount_max: filters.amount_max || undefined,
        vendor: filters.vendor || undefined,
        ordering,
        page: currentPage,
        page_size: pageSize,
      };

      // Finance users get ALL requests, others get only their own
      const response = user?.role === 'FINANCE'
        ? await purchaseRequestsAPI.getAll(params)
        : await purchaseRequestsAPI.getMyRequests(params);

      // Handle paginated response
      if (response && typeof response === 'object' && 'results' in response) {
        setRequests(response.results || []);
        setTotalCount(response.count || 0);
        setTotalPages(Math.ceil((response.count || 0) / pageSize));
      } else {
        setRequests(response || []);
        setTotalCount((response || []).length);
        setTotalPages(1);
      }
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.status, filters.created_after, filters.created_before,
      filters.amount_min, filters.amount_max, filters.vendor, ordering, currentPage, pageSize]);

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
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === 'FINANCE' ? 'Purchase Requests' : 'My Purchase Requests'}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'FINANCE'
                ? 'View all purchase requests (read-only)'
                : 'View and manage your purchase requests'}
            </p>
          </div>
          {user?.role !== 'FINANCE' && (
            <Button onClick={() => navigate(`${getBasePath()}/requests/create`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          )}
        </div>

        {/* Search and Sort */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-2">
            <SearchBar
              value={searchTerm}
              onChange={(value) => setFilter('search', value)}
              placeholder="Search by title, description, or vendor..."
              className="flex-1"
            />
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={ordering} onValueChange={(value) => setFilter('ordering', value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">
                  <div className="flex items-center">
                    <ArrowUpDown className="h-3 w-3 mr-2" />
                    Newest First
                  </div>
                </SelectItem>
                <SelectItem value="created_at">
                  <div className="flex items-center">
                    <ArrowUpDown className="h-3 w-3 mr-2" />
                    Oldest First
                  </div>
                </SelectItem>
                <SelectItem value="-total_amount">
                  <div className="flex items-center">
                    <ArrowUpDown className="h-3 w-3 mr-2" />
                    Amount: High to Low
                  </div>
                </SelectItem>
                <SelectItem value="total_amount">
                  <div className="flex items-center">
                    <ArrowUpDown className="h-3 w-3 mr-2" />
                    Amount: Low to High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Panel - Slides in/out */}
          {showFilters && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <FilterPanel
                filters={filters}
                filterConfigs={[
                  {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Draft', value: 'DRAFT' },
                      { label: 'Pending', value: 'PENDING' },
                      { label: 'Approved L1', value: 'APPROVED_L1' },
                      { label: 'Approved L2', value: 'APPROVED_L2' },
                      { label: 'Approved', value: 'APPROVED' },
                      { label: 'Rejected', value: 'REJECTED' },
                    ],
                    placeholder: 'All statuses',
                  },
                  {
                    key: 'created_after',
                    label: 'Created After',
                    type: 'date',
                  },
                  {
                    key: 'created_before',
                    label: 'Created Before',
                    type: 'date',
                  },
                  {
                    key: 'amount_min',
                    label: 'Min Amount',
                    type: 'number',
                    placeholder: '0.00',
                  },
                  {
                    key: 'amount_max',
                    label: 'Max Amount',
                    type: 'number',
                    placeholder: '10000.00',
                  },
                  {
                    key: 'vendor',
                    label: 'Vendor',
                    type: 'text',
                    placeholder: 'Vendor name',
                  },
                ]}
                onFilterChange={setFilter}
                onClearFilters={() => {
                  // Clear only filter-specific params, preserve search, page_size, and ordering
                  const filtersToKeep = {
                    search: searchTerm,
                    page: '1',
                    page_size: pageSize.toString(),
                    ordering: ordering,
                  };
                  clearFilters();
                  setFilters(filtersToKeep);
                }}
              />
            </div>
          )}
        </div>

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
                  : user?.role === 'FINANCE'
                  ? 'No purchase requests found'
                  : 'Get started by creating your first purchase request'}
              </p>
              {!searchTerm && user?.role !== 'FINANCE' && (
                <Button onClick={() => navigate(`${getBasePath()}/requests/create`)}>
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
                {user?.role === 'FINANCE'
                  ? 'A list of all purchase requests in the system'
                  : 'A list of all your purchase requests'}
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
                          onClick={() => navigate(`${getBasePath()}/requests/${request.id}`)}
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

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="mt-4 border-t pt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={(page) => setFilter('page', page.toString())}
                    onPageSizeChange={(size) => {
                      setFilters({
                        page_size: size.toString(),
                        page: '1',
                      });
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RequestsListPage;

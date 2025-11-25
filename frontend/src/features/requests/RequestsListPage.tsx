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
import { usePagination } from '@/hooks/usePagination';
import { handleAndFormatError } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/LoadingSkeletons';
import { NoRequestsEmptyState, NoResultsEmptyState } from '@/components/common/EmptyState';
import type { PurchaseRequestListItem } from '@/types';
import { Plus, Filter, Eye } from 'lucide-react';

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

  const { currentPage, pageSize, setPage, setPageSize } = usePagination();

  // Get filter values from URL
  const searchTerm = getFilter('search', '');
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
        const requestsArray = Array.isArray(response) ? response : [];
        setRequests(requestsArray as PurchaseRequestListItem[]);
        setTotalCount(requestsArray.length);
        setTotalPages(1);
      }
    } catch (error: any) {
      // Handle 404 errors for invalid page numbers by resetting to page 1
      if (error?.response?.status === 404 && currentPage > 1) {
        setPage(1);
      } else {
        const { toastData } = handleAndFormatError(error);
        toast(toastData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.status, filters.created_after, filters.created_before,
      filters.amount_min, filters.amount_max, filters.vendor, ordering, currentPage, pageSize]);

  // Get status badge with subtle colors
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
            <h1 className="text-2xl font-semibold text-gray-900">
              {user?.role === 'FINANCE' ? 'Purchase Requests' : 'My Purchase Requests'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
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
            <span className="text-sm text-gray-500">Sort by:</span>
            <Select value={ordering} onValueChange={(value) => setFilter('ordering', value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Newest First</SelectItem>
                <SelectItem value="created_at">Oldest First</SelectItem>
                <SelectItem value="-total_amount">Amount: High to Low</SelectItem>
                <SelectItem value="total_amount">Amount: Low to High</SelectItem>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Requests</CardTitle>
              <CardDescription>
                {user?.role === 'FINANCE'
                  ? 'A list of all purchase requests in the system'
                  : 'A list of all your purchase requests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={8} />
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          searchTerm ? (
            <NoResultsEmptyState searchTerm={searchTerm} />
          ) : (
            <NoRequestsEmptyState
              onCreateNew={user?.role !== 'FINANCE' ? () => navigate(`${getBasePath()}/requests/create`) : undefined}
            />
          )
        )}

        {/* Requests Table */}
        {!loading && requests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Requests</CardTitle>
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
                        <div className="text-gray-900">{request.title}</div>
                        {request.description && (
                          <div className="text-sm text-gray-500 truncate">
                            {request.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-gray-600">
                        {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(typeof request.total_amount === 'number'
                          ? request.total_amount
                          : parseFloat(request.total_amount as string) || 0)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(request.created_at)}
                      </TableCell>
                      <TableCell>
                        {request.submitted_at ? (
                          <span className="text-gray-500">
                            {formatDate(request.submitted_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
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

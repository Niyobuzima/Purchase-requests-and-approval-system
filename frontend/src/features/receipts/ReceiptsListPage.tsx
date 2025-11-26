import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/LoadingSkeletons';
import { NoReceiptsEmptyState, NoResultsEmptyState } from '@/components/common/EmptyState';
import { receiptsAPI } from '@/api/receipts';
import type { Receipt } from '@/types';
import { Eye } from 'lucide-react';

export const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setFilter, getFilter } = useUrlFilters();
  const { currentPage, pageSize, setPage, setPageSize } = usePagination();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Get filter values from URL
  const searchTerm = getFilter('search', '');
  const statusFilter = getFilter('status', 'all');

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Track previous filter values to detect changes
  const prevFiltersRef = React.useRef({ search: debouncedSearch, status: statusFilter });

  // Reset to page 1 when search or status filter changes (not when page changes)
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    const filtersChanged = prevFilters.search !== debouncedSearch || prevFilters.status !== statusFilter;

    if (filtersChanged && currentPage !== 1) {
      setPage(1);
    }

    // Update ref with current values
    prevFiltersRef.current = { search: debouncedSearch, status: statusFilter };
  }, [debouncedSearch, statusFilter, currentPage, setPage]);

  // Fetch receipts when filters change
  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        const params: any = {
          search: debouncedSearch || undefined,
          validation_status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          page_size: pageSize,
        };

        const response = await receiptsAPI.getAll(params);
        const results = response.results || [];
        const count = response.count || 0;
        const calculatedTotalPages = Math.ceil(count / pageSize) || 1;

        // If we got empty results but there are items, we're on an out-of-range page
        if (results.length === 0 && count > 0 && currentPage > calculatedTotalPages) {
          setPage(calculatedTotalPages);
          return;
        }

        setReceipts(results);
        setTotalCount(count);
        setTotalPages(calculatedTotalPages);
      } catch (error: any) {
        // Handle 404 errors for invalid page numbers by resetting to page 1
        if (error?.response?.status === 404 && currentPage > 1) {
          setPage(1);
        } else {
          toast({
            title: 'Error',
            description: error.response?.data?.error || 'Failed to load receipts',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [debouncedSearch, statusFilter, currentPage, pageSize, toast]);

  // Status badge with subtle colors
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700',
      MATCHED: 'bg-blue-50 text-blue-700',
      APPROVED: 'bg-emerald-50 text-emerald-700',
      VALIDATED: 'bg-emerald-50 text-emerald-700',
      DISCREPANCY: 'bg-red-50 text-red-700',
    };

    const labels: Record<string, string> = {
      PENDING: 'Pending',
      MATCHED: 'Matched',
      APPROVED: 'Approved',
      VALIDATED: 'Validated',
      DISCREPANCY: 'Discrepancy',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  const handleStatusFilterChange = (status: string) => {
    setFilter('status', status);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and validate all uploaded receipts
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <SearchBar
                  value={searchTerm}
                  onChange={(value) => setFilter('search', value)}
                  placeholder="Search by receipt ID, PO number, vendor, or comments..."
                />
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('PENDING')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'MATCHED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('MATCHED')}
                >
                  Matched
                </Button>
                <Button
                  variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('APPROVED')}
                >
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'DISCREPANCY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('DISCREPANCY')}
                >
                  Discrepancies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">All Receipts</CardTitle>
              <CardDescription>
                Click on a receipt to view details and validate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={8} />
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && receipts.length === 0 && (
          searchTerm || statusFilter !== 'all' ? (
            <NoResultsEmptyState searchTerm={searchTerm} />
          ) : (
            <NoReceiptsEmptyState />
          )
        )}

        {/* Receipts Table */}
        {!loading && receipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">All Receipts ({totalCount})</CardTitle>
              <CardDescription>
                Click on a receipt to view details and validate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Request Title</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discrepancies</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        RCP-{receipt.id}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {receipt.purchase_order_number || `PO-${receipt.purchase_order}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-gray-900">
                          {receipt.request_title || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {receipt.uploaded_by_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(receipt.uploaded_at)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(receipt.validation_status)}
                      </TableCell>
                      <TableCell>
                        {receipt.discrepancies && receipt.discrepancies.length > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                            {receipt.discrepancies.length}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {receipt.total_amount ? (
                          formatCurrency(receipt.total_amount)
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`${getBasePath()}/receipts/${receipt.id}/validate`)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {receipt.validation_status === 'PENDING' ? 'Review' : 'View'}
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

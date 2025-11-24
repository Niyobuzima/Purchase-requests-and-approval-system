import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { receiptsAPI } from '@/api/receipts';
import type { Receipt } from '@/types';
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { filters, setFilter, setFilters, getFilter } = useUrlFilters();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Get filter values from URL
  const searchTerm = getFilter('search', '');
  const statusFilter = getFilter('status', 'all');
  const currentPage = parseInt(getFilter('page', '1'));
  const pageSize = parseInt(getFilter('page_size', '20'));

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Reset to page 1 when search or status filter changes
  useEffect(() => {
    if (debouncedSearch !== '' || statusFilter !== 'all') {
      if (currentPage !== 1) {
        setFilter('page', '1');
      }
    }
  }, [debouncedSearch, statusFilter]);

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
        setReceipts(response.results || []);
        setTotalCount(response.count || 0);
        setTotalPages(Math.ceil((response.count || 0) / pageSize));
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.error || 'Failed to load receipts',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [debouncedSearch, statusFilter, currentPage, pageSize, toast]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      PENDING: {
        variant: 'secondary',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending Validation',
      },
      MATCHED: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Matched',
      },
      APPROVED: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Approved',
      },
      DISCREPANCY: {
        variant: 'outline',
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Has Discrepancies',
      },
    };

    const badge = badges[status] || badges.PENDING;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1 w-fit">
        {badge.icon}
        <span>{badge.label}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">
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
                  <Clock className="h-4 w-4 mr-1" />
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'MATCHED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('MATCHED')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Matched
                </Button>
                <Button
                  variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('APPROVED')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'DISCREPANCY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange('DISCREPANCY')}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Discrepancies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading receipts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && receipts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No receipts found
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Receipts will appear here once they are uploaded'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Receipts Table */}
        {!loading && receipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Receipts ({totalCount})</CardTitle>
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
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-mono">RCP-{receipt.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {receipt.purchase_order_number || `PO-${receipt.purchase_order}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {receipt.request_title || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {receipt.uploaded_by_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(receipt.uploaded_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(receipt.validation_status)}
                      </TableCell>
                      <TableCell>
                        {receipt.discrepancies && receipt.discrepancies.length > 0 ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                            <span>{receipt.discrepancies.length}</span>
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {receipt.total_amount ? (
                          <div className="flex items-center justify-end space-x-1 font-semibold text-green-600">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(receipt.total_amount)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`${getBasePath()}/receipts/${receipt.id}/validate`)}
                          variant="default"
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI, PurchaseOrder } from '../../api/purchaseOrders';
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
import { NoPurchaseOrdersEmptyState, NoResultsEmptyState } from '@/components/common/EmptyState';
import { Download, Eye, Upload } from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setFilter, getFilter } = useUrlFilters();
  const { currentPage, pageSize, setPage, setPageSize } = usePagination();

  // Get filter values from URL
  const searchTerm = getFilter('search', '');

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Helper to get base path based on user role
  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  // Fetch purchase orders
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      try {
        setLoading(true);
        const params: any = {
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: pageSize,
        };

        const response = await purchaseOrdersAPI.getAll(params);
        setPurchaseOrders(response.results || []);
        setTotalCount(response.count || 0);
        setTotalPages(Math.ceil((response.count || 0) / pageSize));
      } catch (err: any) {
        // Handle 404 errors for invalid page numbers by resetting to page 1
        if (err?.response?.status === 404 && currentPage > 1) {
          setPage(1);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load purchase orders',
            variant: 'destructive',
          });
          console.error('Failed to load purchase orders:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseOrders();
  }, [debouncedSearch, currentPage, pageSize, toast]);

  const handleDownload = async (po: PurchaseOrder) => {
    if (!po.pdf_file) {
      toast({
        title: 'Error',
        description: 'PDF file not available',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(po.id);
    try {
      await purchaseOrdersAPI.triggerDownload(po.id, po.po_number);
      toast({
        title: 'Success',
        description: `Downloading ${po.po_number}.pdf`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">View and download generated purchase orders</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <SearchBar
              value={searchTerm}
              onChange={(value) => setFilter('search', value)}
              placeholder="Search by PO number, request title, or vendor..."
            />
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">All Purchase Orders</CardTitle>
              <CardDescription>
                Click on a purchase order to view details or download the PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={6} />
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && purchaseOrders.length === 0 && (
          searchTerm ? (
            <NoResultsEmptyState searchTerm={searchTerm} />
          ) : (
            <NoPurchaseOrdersEmptyState />
          )
        )}

        {/* Purchase Orders List */}
        {!loading && purchaseOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">All Purchase Orders ({totalCount})</CardTitle>
              <CardDescription>
                Click on a purchase order to view details or download the PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">
                        {po.po_number}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-gray-900" title={po.request_title}>
                          {po.request_title}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{po.requester_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {(() => {
                          const val = Number(po.request_total);
                          return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(Number.isFinite(val) ? val : 0);
                        })()}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(po.generated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            onClick={() => navigate(`${getBasePath()}/purchase-orders/${po.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {po.pdf_file ? (
                            <>
                              <Button
                                onClick={() => handleDownload(po)}
                                disabled={downloading === po.id}
                                variant="outline"
                                size="sm"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                {downloading === po.id ? 'Downloading...' : 'Download'}
                              </Button>
                              <Button
                                onClick={() => navigate(`${getBasePath()}/purchase-orders/${po.id}/upload-receipt`)}
                                variant="outline"
                                size="sm"
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Upload Receipt
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded">
                              PDF Processing
                            </span>
                          )}
                        </div>
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

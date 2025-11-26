import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { purchaseOrdersAPI, type PurchaseOrderDetail } from '@/api/purchaseOrders';
import { receiptsAPI } from '@/api/receipts';
import type { Receipt } from '@/types';
import { ArrowLeft, Download, Upload, Eye } from 'lucide-react';

export const PurchaseOrderDetailPage: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Helper to get base path based on user role
  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  useEffect(() => {
    loadPurchaseOrderDetails();
  }, [poId]);

  const loadPurchaseOrderDetails = async () => {
    if (!poId) {
      toast({
        title: 'Error',
        description: 'Purchase Order ID is required',
        variant: 'destructive',
      });
      navigate(`${getBasePath()}/purchase-orders`);
      return;
    }

    // Validate poId is a valid numeric string
    const id = parseInt(poId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast({
        title: 'Error',
        description: 'Invalid Purchase Order ID',
        variant: 'destructive',
      });
      navigate(`${getBasePath()}/purchase-orders`);
      return;
    }

    try {
      setLoading(true);
      const [po, receiptsData] = await Promise.all([
        purchaseOrdersAPI.getById(id),
        receiptsAPI.getAll({ purchase_order: id }),
      ]);

      setPurchaseOrder(po);
      setReceipts(receiptsData.results || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load purchase order details',
        variant: 'destructive',
      });
      navigate(`${getBasePath()}/purchase-orders`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!purchaseOrder) return;

    setDownloading(true);
    try {
      await purchaseOrdersAPI.triggerDownload(purchaseOrder.id, purchaseOrder.po_number);
      toast({
        title: 'Success',
        description: 'Purchase Order PDF downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.response?.data?.error || 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getValidationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700',
      MATCHED: 'bg-emerald-50 text-emerald-700',
      DISCREPANCY: 'bg-red-50 text-red-700',
      APPROVED: 'bg-blue-50 text-blue-700',
    };

    const labels: Record<string, string> = {
      PENDING: 'Pending',
      MATCHED: 'Matched',
      DISCREPANCY: 'Discrepancy',
      APPROVED: 'Approved',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

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
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Purchase Order Not Found</h2>
              <p className="text-gray-500 mb-6">
                The purchase order you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate(`${getBasePath()}/purchase-orders`)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Purchase Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Safely access request_details with fallbacks
  const requestDetails = purchaseOrder.request_details;
  const items = requestDetails?.items && Array.isArray(requestDetails.items) ? requestDetails.items : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`${getBasePath()}/purchase-orders`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{purchaseOrder.po_number}</h1>
              <p className="text-sm text-gray-500 mt-1">{requestDetails?.title || 'Untitled Request'}</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={downloading || !purchaseOrder.pdf_file}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </Button>
              <Button
                onClick={() => navigate(`${getBasePath()}/purchase-orders/${purchaseOrder.id}/upload-receipt`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Purchase Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Purchase Request Details</CardTitle>
                <CardDescription>Original request information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Requester</p>
                    <p className="font-medium text-gray-900">{purchaseOrder.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.vendor_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(requestDetails?.total_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(requestDetails?.status || 'UNKNOWN')}
                    </div>
                  </div>
                </div>

                {requestDetails?.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-gray-900">
                      {requestDetails?.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Items</CardTitle>
                <CardDescription>
                  {items.length} item(s) in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-start justify-between p-4 border rounded-lg bg-white"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>Unit Price: {formatCurrency(item.unit_price)}</span>
                          {item.unit_of_measure && (
                            <>
                              <span>•</span>
                              <span>{item.unit_of_measure}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Total Amount:</span>
                  <span className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(requestDetails?.total_amount || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Receipts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Receipts</CardTitle>
                <CardDescription>
                  {receipts.length === 0
                    ? 'No receipts uploaded yet'
                    : `${receipts.length} receipt(s) uploaded`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900 font-medium">No receipts uploaded</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Upload a receipt to validate against this PO</p>
                    <Button
                      onClick={() =>
                        navigate(`${getBasePath()}/purchase-orders/${purchaseOrder.id}/upload-receipt`)
                      }
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-white"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            Receipt #{receipt.id}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded by {receipt.uploaded_by_name} on {formatDate(receipt.uploaded_at)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getValidationStatusBadge(receipt.validation_status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`${getBasePath()}/receipts/${receipt.id}/validate`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {receipt.validation_status === 'PENDING' ? 'Review' : 'View'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Generated</p>
                  <p className="font-medium text-gray-900">{formatDate(purchaseOrder.generated_at)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Requester</p>
                  <p className="font-medium text-gray-900">{purchaseOrder.requester_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(requestDetails?.total_amount || 0)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Items</p>
                  <p className="font-medium text-gray-900">
                    {items.length} item(s)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Approval Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Approval Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requestDetails?.approved_l1_by && (
                    <div className="border-l-2 border-emerald-400 pl-4">
                      <p className="text-sm font-medium text-gray-900">Level 1 Approved</p>
                      <p className="text-xs text-gray-500">
                        by {requestDetails.approved_l1_by.first_name}{' '}
                        {requestDetails.approved_l1_by.last_name}
                      </p>
                      {requestDetails?.approved_l1_at && (
                        <p className="text-xs text-gray-400">
                          {formatDate(requestDetails.approved_l1_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {requestDetails?.approved_l2_by && (
                    <div className="border-l-2 border-emerald-400 pl-4">
                      <p className="text-sm font-medium text-gray-900">Level 2 Approved</p>
                      <p className="text-xs text-gray-500">
                        by {requestDetails.approved_l2_by.first_name}{' '}
                        {requestDetails.approved_l2_by.last_name}
                      </p>
                      {requestDetails?.approved_l2_at && (
                        <p className="text-xs text-gray-400">
                          {formatDate(requestDetails.approved_l2_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {requestDetails?.rejected_by && (
                    <div className="border-l-2 border-red-400 pl-4">
                      <p className="text-sm font-medium text-gray-900">Rejected</p>
                      <p className="text-xs text-gray-500">
                        by {requestDetails.rejected_by.first_name}{' '}
                        {requestDetails.rejected_by.last_name}
                      </p>
                      {requestDetails?.rejected_at && (
                        <p className="text-xs text-gray-400">
                          {formatDate(requestDetails.rejected_at)}
                        </p>
                      )}
                      {requestDetails?.rejection_reason && (
                        <p className="text-xs text-gray-600 mt-1">
                          {requestDetails.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {!requestDetails?.approved_l1_by &&
                   !requestDetails?.approved_l2_by &&
                   !requestDetails?.rejected_by && (
                    <p className="text-sm text-gray-500">No approval actions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { purchaseOrdersAPI, type PurchaseOrderDetail } from '@/api/purchaseOrders';
import { receiptsAPI } from '@/api/receipts';
import type { Receipt } from '@/types';
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  Loader2,
  Package,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';

export const PurchaseOrderDetailPage: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
      navigate('/staff/purchase-orders');
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
      navigate('/staff/purchase-orders');
      return;
    }

    try {
      setLoading(true);
      const [po, receiptsData] = await Promise.all([
        purchaseOrdersAPI.getById(id),
        receiptsAPI.getAll({ purchase_order: id }),
      ]);

      setPurchaseOrder(po);
      setReceipts(receiptsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load purchase order details',
        variant: 'destructive',
      });
      navigate('/staff/purchase-orders');
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

  const getValidationStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case 'MATCHED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Matched
          </Badge>
        );
      case 'DISCREPANCY':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Discrepancy
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              The purchase order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/staff/purchase-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/staff/purchase-orders')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchase Orders
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{purchaseOrder.po_number}</h1>
            <p className="text-gray-600 mt-1">{purchaseOrder.request_details.title}</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading || !purchaseOrder.pdf_file}
              variant="outline"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/staff/purchase-orders/${purchaseOrder.id}/upload-receipt`)}
              className="bg-green-600 hover:bg-green-700"
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
              <CardTitle>Purchase Request Details</CardTitle>
              <CardDescription>Original request information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Requester</Label>
                  <p className="font-medium">{purchaseOrder.requester_name}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Vendor</Label>
                  <p className="font-medium">
                    {purchaseOrder.request_details.vendor_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Total Amount</Label>
                  <p className="font-medium text-lg">
                    ${Number(purchaseOrder.request_details.total_amount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge className="bg-green-100 text-green-800">
                    {purchaseOrder.request_details.status}
                  </Badge>
                </div>
              </div>

              {purchaseOrder.request_details.description && (
                <div>
                  <Label className="text-gray-600">Description</Label>
                  <p className="text-gray-900 mt-1">
                    {purchaseOrder.request_details.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {purchaseOrder.request_details.items.length} item(s) in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchaseOrder.request_details.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span>Unit Price: ${Number(item.unit_price).toFixed(2)}</span>
                            {item.unit_of_measure && (
                              <>
                                <span>•</span>
                                <span>{item.unit_of_measure}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">
                        ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-medium text-gray-700">Total Amount:</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${Number(purchaseOrder.request_details.total_amount).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Receipts */}
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>
                {receipts.length === 0
                  ? 'No receipts uploaded yet'
                  : `${receipts.length} receipt(s) uploaded`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No receipts have been uploaded yet</p>
                  <Button
                    onClick={() =>
                      navigate(`/staff/purchase-orders/${purchaseOrder.id}/upload-receipt`)
                    }
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Receipt #{receipt.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Uploaded by {receipt.uploaded_by_name} on{' '}
                            {new Date(receipt.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getValidationStatusBadge(receipt.validation_status)}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/staff/receipts/${receipt.id}/validate`)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Validate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(receipt.receipt_url, '_blank')}
                        >
                          View File
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
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Generated</p>
                  <p className="font-medium">
                    {new Date(purchaseOrder.generated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Requester</p>
                  <p className="font-medium">{purchaseOrder.requester_name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-medium text-lg">
                    ${Number(purchaseOrder.request_details.total_amount).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Items</p>
                  <p className="font-medium">
                    {purchaseOrder.request_details.items.length} item(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseOrder.request_details.approved_l1_by && (
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Level 1 Approved</p>
                      <p className="text-xs text-gray-600">
                        by{' '}
                        {purchaseOrder.request_details.approved_l1_by.first_name}{' '}
                        {purchaseOrder.request_details.approved_l1_by.last_name}
                      </p>
                      {purchaseOrder.request_details.approved_l1_at && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            purchaseOrder.request_details.approved_l1_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {purchaseOrder.request_details.approved_l2_by && (
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Level 2 Approved</p>
                      <p className="text-xs text-gray-600">
                        by{' '}
                        {purchaseOrder.request_details.approved_l2_by.first_name}{' '}
                        {purchaseOrder.request_details.approved_l2_by.last_name}
                      </p>
                      {purchaseOrder.request_details.approved_l2_at && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            purchaseOrder.request_details.approved_l2_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {purchaseOrder.request_details.rejected_by && (
                  <div className="flex items-start space-x-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Rejected</p>
                      <p className="text-xs text-gray-600">
                        by{' '}
                        {purchaseOrder.request_details.rejected_by.first_name}{' '}
                        {purchaseOrder.request_details.rejected_by.last_name}
                      </p>
                      {purchaseOrder.request_details.rejected_at && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            purchaseOrder.request_details.rejected_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                      {purchaseOrder.request_details.rejection_reason && (
                        <p className="text-xs text-gray-700 mt-1">
                          {purchaseOrder.request_details.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

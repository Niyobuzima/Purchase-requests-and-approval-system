import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { receiptsAPI } from '@/api/receipts';
import { purchaseOrdersAPI, type PurchaseOrderDetail } from '@/api/purchaseOrders';
import type { Receipt, ReceiptDiscrepancy } from '@/types';
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ThumbsUp,
} from 'lucide-react';

export const ReceiptValidationPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [financeComments, setFinanceComments] = useState('');

  useEffect(() => {
    loadReceiptDetails();
  }, [receiptId]);

  const loadReceiptDetails = async () => {
    if (!receiptId) {
      toast({
        title: 'Error',
        description: 'Receipt ID is required',
        variant: 'destructive',
      });
      navigate('/staff/purchase-orders');
      return;
    }

    // Validate receiptId is a valid numeric string
    const id = parseInt(receiptId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast({
        title: 'Error',
        description: 'Invalid receipt ID',
        variant: 'destructive',
      });
      navigate('/staff/purchase-orders');
      return;
    }

    try {
      setLoading(true);
      const receiptData = await receiptsAPI.getById(id);
      setReceipt(receiptData);

      // Load PO details for comparison
      if (receiptData.purchase_order) {
        const poData = await purchaseOrdersAPI.getById(receiptData.purchase_order);
        setPurchaseOrder(poData);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load receipt details',
        variant: 'destructive',
      });
      navigate('/staff/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!receipt) return;

    setApproving(true);
    try {
      await receiptsAPI.approve(receipt.id, {
        finance_comments: financeComments || undefined,
      });
      toast({
        title: 'Receipt Approved',
        description: 'Receipt has been approved successfully',
      });
      await loadReceiptDetails(); // Reload to get updated status
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.response?.data?.error || 'Failed to approve receipt',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending Validation
          </Badge>
        );
      case 'MATCHED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            All Matched
          </Badge>
        );
      case 'DISCREPANCY':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Has Discrepancies
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <ThumbsUp className="h-3 w-3 mr-1" />
            Approved by Finance
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
            Low
          </Badge>
        );
      default:
        return <Badge className="text-xs">{severity}</Badge>;
    }
  };

  const getDiscrepancyIcon = (type: string) => {
    switch (type) {
      case 'vendor_mismatch':
      case 'amount_mismatch':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'item_count_mismatch':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'missing_item':
        return <XCircle className="h-5 w-5 text-orange-600" />;
      case 'extra_item':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!receipt || !purchaseOrder) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Receipt Not Found</h2>
            <p className="text-gray-600 mb-6">
              The receipt you're looking for doesn't exist or you don't have permission to view it.
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/staff/purchase-orders/${receipt.purchase_order}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to PO Details
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receipt Validation</h1>
            <p className="text-gray-600 mt-1">
              Receipt #{receipt.id} for PO {purchaseOrder.po_number}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(receipt.validation_status)}
            <Button
              variant="outline"
              onClick={() => window.open(receipt.receipt_url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Info Banner for Pending Validation */}
      {receipt.validation_status === 'PENDING' && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-900">
              Receipt data is being extracted and validated automatically. This may take a few moments.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Purchase Order Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Purchase Order</span>
            </CardTitle>
            <CardDescription>Original PO details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">PO Number</Label>
              <p className="font-medium text-lg">{purchaseOrder.po_number}</p>
            </div>
            <div>
              <Label className="text-gray-600">Vendor</Label>
              <p className="font-medium">
                {purchaseOrder.request_details.vendor_name || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Total Amount</Label>
              <p className="font-medium text-lg text-green-600">
                ${Number(purchaseOrder.request_details.total_amount).toFixed(2)}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Items ({purchaseOrder.request_details.items.length})</Label>
              <div className="mt-2 space-y-2">
                {purchaseOrder.request_details.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-gray-600">
                      Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)} = $
                      {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span>Receipt Data</span>
            </CardTitle>
            <CardDescription>AI-extracted from uploaded receipt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {receipt.extracted_receipt_data?.success ? (
              <>
                <div>
                  <Label className="text-gray-600">Invoice Number</Label>
                  <p className="font-medium">
                    {receipt.extracted_receipt_data.invoice_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Vendor</Label>
                  <p className="font-medium">
                    {receipt.extracted_receipt_data.vendor_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Total Amount</Label>
                  <p className="font-medium text-lg text-purple-600">
                    ${Number(receipt.extracted_receipt_data.total_amount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">
                    Items ({receipt.extracted_receipt_data.items?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {receipt.extracted_receipt_data.items?.map((item, idx) => {
                      const qty = Number(item.quantity ?? 0) || 0;
                      const price = Number(item.unit_price ?? 0) || 0;
                      const total = qty * price;

                      return (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-gray-600">
                            Qty: {qty.toFixed(2)} × ${price.toFixed(2)} = $
                            {total.toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-gray-600">
                  {receipt.extracted_receipt_data?.error ||
                    'AI extraction pending or failed'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies */}
      {receipt.discrepancies && receipt.discrepancies.length > 0 && (
        <Card className="mb-6 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Discrepancies Found ({receipt.discrepancies.length})</span>
            </CardTitle>
            <CardDescription>
              Issues detected when comparing receipt with purchase order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {receipt.discrepancies.map((discrepancy: ReceiptDiscrepancy, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg bg-white hover:bg-gray-50"
                >
                  <div className="flex items-start space-x-3">
                    {getDiscrepancyIcon(discrepancy.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{discrepancy.message}</p>
                        {getSeverityBadge(discrepancy.severity)}
                      </div>
                      {discrepancy.po_value !== undefined && (
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <Label className="text-xs text-gray-600">PO Value</Label>
                            <p className="font-medium text-green-700">
                              {JSON.stringify(discrepancy.po_value)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Receipt Value</Label>
                            <p className="font-medium text-purple-700">
                              {JSON.stringify(discrepancy.receipt_value)}
                            </p>
                          </div>
                        </div>
                      )}
                      {discrepancy.difference !== undefined && (
                        <p className="text-sm text-gray-600 mt-2">
                          Difference: ${Math.abs(discrepancy.difference).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Discrepancies */}
      {receipt.validation_status === 'MATCHED' && (!receipt.discrepancies || receipt.discrepancies.length === 0) && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-6 flex items-center space-x-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Perfect Match!</h3>
              <p className="text-sm text-green-700">
                Receipt data matches the purchase order exactly. No discrepancies found.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance Approval Section - Only visible to Finance users */}
      {user?.role === 'FINANCE' &&
        (receipt.validation_status === 'DISCREPANCY' || receipt.validation_status === 'MATCHED') && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Finance Approval</CardTitle>
              <CardDescription>
                Review and approve this receipt{' '}
                {receipt.validation_status === 'DISCREPANCY' ? 'despite discrepancies' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="finance-comments">Comments (Optional)</Label>
                <Textarea
                  id="finance-comments"
                  placeholder="Add any notes about this approval..."
                  value={financeComments}
                  onChange={(e) => setFinanceComments(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleApprove}
                disabled={approving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {approving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve Receipt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Approval Info */}
      {receipt.validation_status === 'APPROVED' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <ThumbsUp className="h-8 w-8 text-blue-600" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">Receipt Approved</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Approved by {receipt.approved_by_name} on{' '}
                  {receipt.approved_at && new Date(receipt.approved_at).toLocaleDateString()}
                </p>
                {receipt.finance_comments && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <Label className="text-xs text-blue-700">Finance Comments:</Label>
                    <p className="text-sm text-gray-900 mt-1">{receipt.finance_comments}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

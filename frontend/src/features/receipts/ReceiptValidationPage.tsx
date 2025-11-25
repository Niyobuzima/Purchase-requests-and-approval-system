import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { receiptsAPI } from '@/api/receipts';
import { purchaseOrdersAPI, type PurchaseOrderDetail } from '@/api/purchaseOrders';
import type { Receipt, ReceiptDiscrepancy } from '@/types';
import { ArrowLeft, Download } from 'lucide-react';

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

  // Helper function to get the appropriate back navigation path
  const getBackPath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance/dashboard';
    }
    return '/staff/purchase-orders';
  };

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
      navigate(getBackPath());
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
      navigate(getBackPath());
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
      navigate(getBackPath());
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
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700',
      MATCHED: 'bg-emerald-50 text-emerald-700',
      DISCREPANCY: 'bg-red-50 text-red-700',
      APPROVED: 'bg-blue-50 text-blue-700',
    };

    const labels: Record<string, string> = {
      PENDING: 'Pending Validation',
      MATCHED: 'All Matched',
      DISCREPANCY: 'Has Discrepancies',
      APPROVED: 'Approved by Finance',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-50 text-red-700',
      medium: 'bg-amber-50 text-amber-700',
      low: 'bg-gray-100 text-gray-600',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[severity] || styles.low}`}>
        {severity}
      </span>
    );
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt || !purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Receipt Not Found</h2>
              <p className="text-gray-500 mb-6">
                The receipt you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate(getBackPath())} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {user?.role === 'FINANCE' ? 'Back to Dashboard' : 'Back to Purchase Orders'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(getBackPath())}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {user?.role === 'FINANCE' ? 'Back to Dashboard' : 'Back to PO Details'}
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Receipt Validation</h1>
              <p className="text-sm text-gray-500 mt-1">
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
          <Card className="mb-6 border-l-4 border-l-amber-400">
            <CardContent className="py-4">
              <p className="text-sm text-gray-700">
                Receipt data is being extracted and validated automatically. This may take a few moments.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Purchase Order Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Purchase Order</CardTitle>
              <CardDescription>Original PO details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">PO Number</p>
                <p className="font-medium text-gray-900">{purchaseOrder.po_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium text-gray-900">
                  {purchaseOrder.request_details.vendor_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(purchaseOrder.request_details.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Items ({purchaseOrder.request_details.items.length})
                </p>
                <div className="space-y-2">
                  {purchaseOrder.request_details.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Qty: {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
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
              <CardTitle className="text-lg font-medium">Receipt Data</CardTitle>
              <CardDescription>AI-extracted from uploaded receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {receipt.extracted_receipt_data?.success ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Invoice Number</p>
                    <p className="font-medium text-gray-900">
                      {receipt.extracted_receipt_data.invoice_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="font-medium text-gray-900">
                      {receipt.extracted_receipt_data.vendor_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(receipt.extracted_receipt_data.total_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Items ({receipt.extracted_receipt_data.items?.length || 0})
                    </p>
                    <div className="space-y-2">
                      {receipt.extracted_receipt_data.items?.map((item, idx) => {
                        const qty = Number(item.quantity ?? 0) || 0;
                        const price = Number(item.unit_price ?? 0) || 0;
                        const total = qty * price;

                        return (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm font-medium text-gray-900">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Qty: {qty.toFixed(2)} × {formatCurrency(price)} = {formatCurrency(total)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border">
                  <p className="text-gray-900 font-medium">Extraction Pending</p>
                  <p className="text-sm text-gray-500 mt-1">
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
          <Card className="mb-6 border-l-4 border-l-red-400">
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Discrepancies Found ({receipt.discrepancies.length})
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
                    className="p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{discrepancy.message}</p>
                      {getSeverityBadge(discrepancy.severity)}
                    </div>
                    {discrepancy.po_value !== undefined && (
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">PO Value</p>
                          <p className="font-medium text-gray-900">
                            {JSON.stringify(discrepancy.po_value)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Receipt Value</p>
                          <p className="font-medium text-gray-900">
                            {JSON.stringify(discrepancy.receipt_value)}
                          </p>
                        </div>
                      </div>
                    )}
                    {discrepancy.difference !== undefined && (
                      <p className="text-sm text-gray-500 mt-2">
                        Difference: {formatCurrency(Math.abs(discrepancy.difference))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Discrepancies */}
        {receipt.validation_status === 'MATCHED' && (!receipt.discrepancies || receipt.discrepancies.length === 0) && (
          <Card className="mb-6 border-l-4 border-l-emerald-400">
            <CardContent className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">Perfect Match!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Receipt data matches the purchase order exactly. No discrepancies found.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Finance Approval Section - Only visible to Finance users */}
        {user?.role === 'FINANCE' &&
          (receipt.validation_status === 'DISCREPANCY' || receipt.validation_status === 'MATCHED') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Finance Approval</CardTitle>
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
                  className="w-full"
                >
                  {approving ? 'Approving...' : 'Approve Receipt'}
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Approval Info */}
        {receipt.validation_status === 'APPROVED' && (
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">Receipt Approved</h3>
              <p className="text-sm text-gray-500 mt-1">
                Approved by {receipt.approved_by_name} on{' '}
                {receipt.approved_at && new Date(receipt.approved_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {receipt.finance_comments && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs text-gray-500">Finance Comments:</p>
                  <p className="text-sm text-gray-900 mt-1">{receipt.finance_comments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

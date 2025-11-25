import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { purchaseOrdersAPI, type PurchaseOrderDetail } from '@/api/purchaseOrders';
import { receiptsAPI } from '@/api/receipts';
import { Upload, ArrowLeft } from 'lucide-react';

export const UploadReceiptPage: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Helper to get base path based on user role
  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount || 0);
  };

  useEffect(() => {
    loadPurchaseOrder();
  }, [poId]);

  const loadPurchaseOrder = async () => {
    if (!poId) {
      toast({
        title: 'Error',
        description: 'Purchase Order ID is required',
        variant: 'destructive',
      });
      navigate(`${getBasePath()}/purchase-orders`);
      return;
    }

    try {
      const po = await purchaseOrdersAPI.getById(parseInt(poId));
      setPurchaseOrder(po);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load purchase order',
        variant: 'destructive',
      });
      navigate(`${getBasePath()}/purchase-orders`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PDF and image files (JPEG, PNG) are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'File size must not exceed 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !purchaseOrder) {
      return;
    }

    setUploading(true);

    try {
      await receiptsAPI.create({
        purchase_order: purchaseOrder.id,
        receipt_file: selectedFile,
      });

      toast({
        title: 'Success',
        description: 'Receipt uploaded successfully! AI is processing the document...',
      });

      // Redirect to validation page or PO details
      navigate(`${getBasePath()}/purchase-orders/${purchaseOrder.id}`);
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.error || 'Failed to upload receipt',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`${getBasePath()}/purchase-orders/${purchaseOrder.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Order
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Upload Receipt</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload the receipt for verification against the purchase order
          </p>
        </div>

        {/* Purchase Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Purchase Order Details</CardTitle>
            <CardDescription>Review the PO before uploading the receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">PO Number</p>
                <p className="font-medium text-gray-900">{purchaseOrder.po_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium text-gray-900">{purchaseOrder.request_details.vendor_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(purchaseOrder.request_details.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <p className="font-medium text-gray-900">{purchaseOrder.request_details.items.length} items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Receipt File</CardTitle>
            <CardDescription>
              Upload the receipt as PDF or image (JPEG, PNG). Maximum file size: 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-gray-900 bg-gray-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50">
                    <span className="text-emerald-700 text-xl">✓</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                    <Upload className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">
                      Drag and drop your receipt file here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="receipt-file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('receipt-file')?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supported formats: PDF, JPEG, PNG (Max: 10MB)
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-900">AI Processing</p>
                <p className="text-sm text-gray-500 mt-1">
                  After upload, our AI will automatically extract data from the receipt and validate it against the purchase order.
                  You can review the validation results on the PO details page.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Receipt'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`${getBasePath()}/purchase-orders/${purchaseOrder.id}`)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

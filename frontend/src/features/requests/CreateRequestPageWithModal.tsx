import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError, ErrorHandlers } from '@/utils/errorHandler';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { RequestItem, CreatePurchaseRequestData, ExtractedDocumentData } from '@/types';
import { Plus, Edit, Trash2, DollarSign, Package, Upload as UploadIcon, FileText, Sparkles } from 'lucide-react';
import AddItemModal from './components/AddItemModal';
import FileUpload from '@/components/uploads/FileUpload';

const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);

  // Add new item
  const handleAddItem = (item: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>) => {
    if (editingIndex !== undefined) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingIndex] = item;
      setItems(updatedItems);
      setEditingIndex(undefined);
    } else {
      // Add new item
      setItems([...items, item]);
    }
  };

  // Edit item
  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadedFileUrl(null);
    setExtractedData(null);
  };

  // Handle file removal
  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadedFileUrl(null);
    setExtractedData(null);
  };

  // Upload document
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    // Create draft request first if not already created
    if (!currentRequestId) {
      setUploading(true);
      try {
        // Create minimal draft request without items (AI will populate items after processing)
        const data: CreatePurchaseRequestData = {
          title: title.trim() || 'New Purchase Request',
          description: description || 'Processing uploaded document...',
          status: 'DRAFT',
          items: [], // Empty items for DRAFT - will be filled by AI extraction
        };

        const response = await purchaseRequestsAPI.create(data);
        setCurrentRequestId(response.id);

        // Now upload document
        const uploadResponse = await purchaseRequestsAPI.uploadDocument(response.id, selectedFile);
        setUploadedFileUrl(uploadResponse.document_url || null);

        toast({
          title: 'Document uploaded',
          description: 'Document uploaded successfully. Processing with AI...',
        });

        // Automatically trigger AI processing
        await processDocumentAfterUpload(response.id);
      } catch (error) {
        const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
        toast(toastData);
      } finally {
        setUploading(false);
      }
    } else {
      // Request already exists, just upload
      setUploading(true);
      try {
        const uploadResponse = await purchaseRequestsAPI.uploadDocument(currentRequestId, selectedFile);
        setUploadedFileUrl(uploadResponse.document_url || null);

        toast({
          title: 'Document uploaded',
          description: 'Document uploaded successfully. Processing with AI...',
        });

        // Automatically trigger AI processing
        await processDocumentAfterUpload(currentRequestId);
      } catch (error) {
        const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
        toast(toastData);
      } finally {
        setUploading(false);
      }
    }
  };

  // Process document automatically after upload
  const processDocumentAfterUpload = async (requestId: number) => {
    setProcessing(true);
    try {
      const response = await purchaseRequestsAPI.processDocument(requestId);
      setExtractedData(response.extracted_data);

      if (response.document_processed && response.extracted_data.success) {
        // Auto-fill form with extracted data
        if (response.extracted_data.vendor_name) {
          setTitle(response.extracted_data.vendor_name);
        }

        if (response.extracted_data.invoice_number) {
          setDescription(`Invoice #${response.extracted_data.invoice_number}${response.extracted_data.date ? ` - ${response.extracted_data.date}` : ''}`);
        }

        // Set extracted items
        if (response.extracted_data.items && response.extracted_data.items.length > 0) {
          const extractedItems = response.extracted_data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_of_measure: 'unit',
            notes: '',
          }));
          setItems(extractedItems);
        }

        toast({
          title: 'AI Processing Complete',
          description: `Successfully extracted ${response.extracted_data.items?.length || 0} items from the invoice. Review and submit when ready.`,
        });
      } else {
        toast({
          title: 'Processing failed',
          description: response.extracted_data.error || 'Could not extract data from document. You can add items manually.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setProcessing(false);
    }
  };

  // Process document with AI
  const handleProcessDocument = async () => {
    if (!currentRequestId || !uploadedFileUrl) {
      toast({
        title: 'No document uploaded',
        description: 'Please upload a document first',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await purchaseRequestsAPI.processDocument(currentRequestId);
      setExtractedData(response.extracted_data);

      if (response.document_processed && response.extracted_data.success) {
        // Pre-fill form with extracted data
        if (response.extracted_data.vendor_name && !title.trim()) {
          setTitle(response.extracted_data.vendor_name);
        }

        // Add extracted items
        if (response.extracted_data.items && response.extracted_data.items.length > 0) {
          const extractedItems = response.extracted_data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_of_measure: 'unit',
            notes: '',
          }));
          setItems(extractedItems);
        }

        toast({
          title: 'Document processed',
          description: `Successfully extracted ${response.extracted_data.items?.length || 0} items from the document`,
        });
      } else {
        toast({
          title: 'Processing failed',
          description: response.extracted_data.error || 'Could not extract data from document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate subtotal for an item
  const calculateSubtotal = (item: typeof items[0]): number => {
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
    return qty * price || 0;
  };

  // Calculate total amount
  const calculateTotal = (): number => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return false;
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      let responseId = currentRequestId;

      if (currentRequestId) {
        // Update existing draft request
        await purchaseRequestsAPI.update(currentRequestId, data);
      } else {
        // Create new request
        const response = await purchaseRequestsAPI.create(data);
        responseId = response.id;
      }

      toast({
        title: 'Draft saved',
        description: 'Purchase request saved as draft successfully',
      });

      navigate(`/staff/requests/${responseId}`);
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      let responseId = currentRequestId;

      if (currentRequestId) {
        // Update existing draft request
        await purchaseRequestsAPI.update(currentRequestId, data);
      } else {
        // Create new request
        const response = await purchaseRequestsAPI.create(data);
        responseId = response.id;
      }

      // Submit for approval
      await purchaseRequestsAPI.submit(responseId);

      toast({
        title: 'Request submitted',
        description: 'Purchase request submitted for approval successfully',
      });

      navigate('/staff/requests');
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-gray-600 mt-1">Upload an invoice/quotation and let AI extract the details automatically</p>
        </div>

        {/* Document Upload Section - FIRST */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                1
              </div>
              <span>Upload Invoice/Quotation</span>
            </CardTitle>
            <CardDescription>
              Upload your invoice or quotation file and AI will automatically extract all details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={10485760}
              disabled={uploading || processing}
              selectedFile={selectedFile}
              uploadedFileUrl={uploadedFileUrl}
            />

            {selectedFile && !uploadedFileUrl && (
              <Button
                onClick={handleUploadDocument}
                disabled={uploading || processing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {uploading || processing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    {uploading ? 'Uploading...' : 'Processing with AI...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upload & Process with AI
                  </>
                )}
              </Button>
            )}

            {extractedData && extractedData.success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900">
                      AI Extraction Successful
                    </h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-green-700">
                        Extracted {extractedData.items?.length || 0} item(s) from the document
                      </p>
                      {extractedData.vendor_name && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Vendor:</span> {extractedData.vendor_name}
                        </p>
                      )}
                      {extractedData.total_amount && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Total:</span> ${extractedData.total_amount.toFixed(2)}
                        </p>
                      )}
                      {extractedData.invoice_number && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Invoice #:</span> {extractedData.invoice_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {extractedData && !extractedData.success && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900">
                      Extraction Failed
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {extractedData.error || 'Could not extract data from the document'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details Section - SECOND (after AI extraction) */}
        {extractedData && extractedData.success && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                  2
                </div>
                <span>Review & Edit Details</span>
              </CardTitle>
              <CardDescription>
                AI has extracted the information. You can edit if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title / Vendor Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., ABC Supplies Inc."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Invoice details, notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Section - THIRD (extracted items, editable) */}
        {extractedData && extractedData.success && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm">
                      3
                    </div>
                    <span>Review Items</span>
                  </CardTitle>
                  <CardDescription>Extracted items from the invoice. You can edit or add more.</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingIndex(undefined);
                    setIsModalOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items extracted</h3>
                  <p className="text-gray-600 mb-4">
                    AI couldn't extract items. Click "Add Item" to add them manually.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingIndex(undefined);
                      setIsModalOpen(true);
                    }}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item Manually
                  </Button>
                </div>
              ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.description}</h4>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center text-lg font-bold text-green-600">
                            <DollarSign className="h-4 w-4" />
                            {calculateSubtotal(item).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="text-gray-500">Qty:</span>
                          <span className="font-medium text-gray-900">{item.quantity}</span>
                          <span className="text-gray-500">{item.unit_of_measure}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1">
                          <span className="text-gray-500">Unit Price:</span>
                          <span className="font-medium text-gray-900">
                            ${typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : item.unit_price}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <Button
                        onClick={() => handleEditItem(index)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleRemoveItem(index)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{items.length}</span> item(s)
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-gray-700">Total Amount:</span>
                  <div className="flex items-center text-2xl font-bold text-green-600">
                    <DollarSign className="h-6 w-6" />
                    <span>{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Actions - Only show after AI processing */}
        {extractedData && extractedData.success && (
          <div className="flex items-center justify-between mt-6">
            <Button
              onClick={() => navigate('/staff/requests')}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <div className="flex space-x-3">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                disabled={loading}
              >
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIndex(undefined);
        }}
        onAdd={handleAddItem}
        editItem={editingIndex !== undefined ? items[editingIndex] : undefined}
        editIndex={editingIndex}
      />
    </div>
  );
};

export default CreateRequestPage;

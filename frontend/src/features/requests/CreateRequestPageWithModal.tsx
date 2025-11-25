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
import { Plus, Edit, Trash2, DollarSign, Package, FileText, Sparkles, PenLine, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import AddItemModal from './components/AddItemModal';
import FileUpload from '@/components/uploads/FileUpload';

type Step = 'upload' | 'choose-method' | 'processing' | 'form';

const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step tracking
  const [step, setStep] = useState<Step>('upload');
  const [useAI, setUseAI] = useState<boolean | null>(null);

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
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Add new item
  const handleAddItem = (item: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>) => {
    if (editingIndex !== undefined) {
      const updatedItems = [...items];
      updatedItems[editingIndex] = item;
      setItems(updatedItems);
      setEditingIndex(undefined);
    } else {
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

  // Upload document and go to method selection
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a proforma/invoice file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Create draft request
      const data: CreatePurchaseRequestData = {
        title: 'New Purchase Request',
        description: 'Processing uploaded document...',
        status: 'DRAFT',
        items: [],
      };

      const response = await purchaseRequestsAPI.create(data);
      setCurrentRequestId(response.id);

      // Upload document
      const uploadResponse = await purchaseRequestsAPI.uploadDocument(response.id, selectedFile);
      setUploadedFileUrl(uploadResponse.document_url || null);

      toast({
        title: 'Document uploaded',
        description: 'Your proforma has been uploaded successfully',
      });

      // Move to method selection
      setStep('choose-method');
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setUploading(false);
    }
  };

  // Process with AI
  const handleProcessWithAI = async () => {
    if (!currentRequestId) return;

    setUseAI(true);
    setStep('processing');
    setProcessingStep('Analyzing document...');

    try {
      // Simulate progress steps
      setTimeout(() => setProcessingStep('Extracting vendor information...'), 1500);
      setTimeout(() => setProcessingStep('Identifying line items...'), 3000);
      setTimeout(() => setProcessingStep('Calculating totals...'), 4500);

      const response = await purchaseRequestsAPI.processDocument(currentRequestId);
      setExtractedData(response.extracted_data);

      // Check if document validation failed (invalid document type)
      if (response.extracted_data.is_valid_document === false) {
        toast({
          title: 'Invalid Document Type',
          description: response.extracted_data.user_message || 'Please upload a valid proforma invoice, receipt, or quotation.',
          variant: 'destructive',
        });
        // Go back to upload step so user can upload correct document
        setStep('upload');
        setSelectedFile(null);
        setUploadedFileUrl(null);
        setCurrentRequestId(null);
        return;
      }

      if (response.document_processed && response.extracted_data.success) {
        // Auto-fill form
        if (response.extracted_data.vendor_name) {
          setTitle(response.extracted_data.vendor_name);
        }

        if (response.extracted_data.invoice_number) {
          setDescription(`Invoice #${response.extracted_data.invoice_number}${response.extracted_data.date ? ` - ${response.extracted_data.date}` : ''}`);
        }

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
          description: `Extracted ${response.extracted_data.items?.length || 0} items. Review and submit when ready.`,
        });
      } else {
        toast({
          title: 'Extraction issue',
          description: response.extracted_data.error || 'Could not extract all data. Please fill in missing details.',
          variant: 'destructive',
        });
      }

      setStep('form');
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
      setStep('form');
    } finally {
      setProcessingStep('');
    }
  };

  // Skip AI, enter manually
  const handleManualEntry = () => {
    setUseAI(false);
    setStep('form');
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

      if (currentRequestId) {
        await purchaseRequestsAPI.update(currentRequestId, data);
      }

      toast({
        title: 'Draft saved',
        description: 'Purchase request saved as draft successfully',
      });

      navigate(`/staff/requests/${currentRequestId}`);
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

      if (currentRequestId) {
        try {
          // Try to update first (only works for DRAFT requests)
          await purchaseRequestsAPI.update(currentRequestId, data);
          // Then submit
          await purchaseRequestsAPI.submit(currentRequestId);
        } catch (updateError: unknown) {
          // Check if request was already submitted (not in DRAFT status)
          const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
          const axiosError = updateError as { response?: { data?: { error?: string; detail?: string } } };
          const serverMessage = axiosError?.response?.data?.error || axiosError?.response?.data?.detail || '';

          if (serverMessage.toLowerCase().includes('draft') || errorMessage.toLowerCase().includes('draft')) {
            // Request was already submitted, just navigate
            toast({
              title: 'Request already submitted',
              description: 'This request has already been submitted for approval',
            });
            navigate('/staff/requests');
            return;
          }
          // Re-throw other errors
          throw updateError;
        }
      }

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
          <p className="text-gray-600 mt-1">
            {step === 'upload' && 'Upload your proforma/invoice to get started'}
            {step === 'choose-method' && 'Choose how to fill in the details'}
            {step === 'processing' && 'AI is analyzing your document...'}
            {step === 'form' && 'Review and complete your purchase request'}
          </p>
        </div>

        {/* Step 1: Upload Document */}
        {step === 'upload' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Upload Proforma/Invoice</CardTitle>
              <CardDescription className="text-base">
                A proforma or invoice document is required for all purchase requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10485760}
                disabled={uploading}
                selectedFile={selectedFile}
                uploadedFileUrl={uploadedFileUrl}
              />

              {selectedFile && (
                <Button
                  onClick={handleUploadDocument}
                  disabled={uploading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              )}
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-gray-500">
                Supported formats: PDF, JPG, PNG (max 10MB)
              </p>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Choose Method */}
        {step === 'choose-method' && (
          <div className="space-y-6">
            {/* Uploaded file preview */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Document Uploaded Successfully</p>
                    <p className="text-sm text-green-700">{selectedFile?.name}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep('upload');
                      setSelectedFile(null);
                      setUploadedFileUrl(null);
                    }}
                  >
                    Change File
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">How would you like to proceed?</h2>
              <p className="text-gray-600">Choose AI extraction for faster entry, or fill in manually</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-400"
                onClick={handleProcessWithAI}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Use AI Extraction</CardTitle>
                  <CardDescription className="text-base">
                    Let AI automatically read and extract all details
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Auto-extracts vendor name
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Reads all line items & prices
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Calculates totals automatically
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button className="bg-purple-600 hover:bg-purple-700 w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract with AI
                  </Button>
                </CardFooter>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
                onClick={handleManualEntry}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <PenLine className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Fill in Manually</CardTitle>
                  <CardDescription className="text-base">
                    Enter all details yourself while viewing the document
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Full control over all fields
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Add items one by one
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Good for complex documents
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full">
                    <PenLine className="h-4 w-4 mr-2" />
                    Enter Manually
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: AI Processing */}
        {step === 'processing' && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-purple-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is Processing</h2>
              <p className="text-gray-600 mb-6">{processingStep || 'Analyzing your document...'}</p>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-600">This may take a few seconds...</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full animate-pulse"
                    style={{ width: '70%' }}
                  />
                </div>
              </div>

              <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Tip:</strong> AI extraction works best with clear, high-quality scans of invoices and quotations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Form */}
        {step === 'form' && (
          <>
            {/* Document Info */}
            <Card className="mb-6 bg-gray-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Attached Document</p>
                      <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                    </div>
                  </div>
                  {uploadedFileUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">
                        View Document
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Extraction Status */}
            {useAI && extractedData && (
              <Card className={`mb-6 ${
                extractedData.is_valid_document === false
                  ? 'bg-red-50 border-red-200'
                  : extractedData.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
              }`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {extractedData.is_valid_document === false ? (
                      <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    ) : extractedData.success ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        extractedData.is_valid_document === false
                          ? 'text-red-900'
                          : extractedData.success
                            ? 'text-green-900'
                            : 'text-amber-900'
                      }`}>
                        {extractedData.is_valid_document === false
                          ? 'Invalid Document Type'
                          : extractedData.success
                            ? `AI Extracted ${extractedData.items?.length || 0} Items`
                            : 'AI Could Not Extract All Data'}
                      </p>
                      <p className={`text-sm ${
                        extractedData.is_valid_document === false
                          ? 'text-red-700'
                          : extractedData.success
                            ? 'text-green-700'
                            : 'text-amber-700'
                      }`}>
                        {extractedData.is_valid_document === false
                          ? extractedData.user_message || 'Please upload a valid proforma invoice, receipt, or quotation.'
                          : extractedData.success
                            ? 'Review the details below and make any necessary changes.'
                            : extractedData.error || 'Please fill in the missing details manually.'}
                      </p>
                      {extractedData.document_type && extractedData.is_valid_document === false && (
                        <p className="text-xs text-red-600 mt-1">
                          Detected document type: {extractedData.document_type}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-blue-600" />
                  <span>Request Details</span>
                </CardTitle>
                <CardDescription>
                  {useAI && extractedData?.success
                    ? 'AI has extracted the information. You can edit if needed.'
                    : 'Enter the details for your purchase request'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title / Vendor Name *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., ABC Supplies Inc. - Office Equipment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details, invoice number, notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items Section */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      <span>Items</span>
                    </CardTitle>
                    <CardDescription>
                      {items.length > 0
                        ? `${items.length} item(s) added. You can edit or add more.`
                        : 'Add the items from your proforma'}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingIndex(undefined);
                      setIsModalOpen(true);
                    }}
                    size="sm"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
                    <p className="text-gray-600 mb-4">
                      Add the items from your proforma/invoice
                    </p>
                    <Button
                      onClick={() => {
                        setEditingIndex(undefined);
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
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
              {items.length > 0 && (
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
              )}
            </Card>

            {/* Actions */}
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
                  disabled={loading || items.length === 0}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || items.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </div>
            </div>
          </>
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

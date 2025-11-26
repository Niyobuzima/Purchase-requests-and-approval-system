import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError } from '@/utils/errorHandler';
import { calculateSubtotal } from '@/utils/calculateSubtotal';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import { approvalsAPI, Approval } from '@/api/approvals';
import { purchaseOrdersAPI, PurchaseOrder } from '@/api/purchaseOrders';
import type { PurchaseRequest } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { ApprovalTimeline } from '@/components/approvals/ApprovalTimeline';
import { StatusBadge } from '@/components/common/StatusBadge';
import { POPreviewModal } from '@/components/pdf/POPreviewModal';
import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { ArrowLeft, Send, Trash2, Edit, Download, Eye, ExternalLink } from 'lucide-react';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<Approval | null>(null);
  const [allApprovals, setAllApprovals] = useState<Approval[]>([]);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [downloadingPO, setDownloadingPO] = useState(false);
  const [showPOPreview, setShowPOPreview] = useState(false);

  // Determine back path based on user role
  const getBackPath = () => {
    if (user?.role === 'APPROVER_L1' || user?.role === 'APPROVER_L2') {
      return '/approver/dashboard';
    }
    if (user?.role === 'FINANCE') {
      return '/finance/requests';
    }
    return '/staff/requests';
  };

  // Fetch request details - optimized with parallel API calls
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const requestId = parseInt(id, 10);
      if (isNaN(requestId)) {
        toast({
          title: 'Invalid Request',
          description: 'Invalid request ID',
          variant: 'destructive',
        });
        navigate(getBackPath());
        return;
      }

      setLoading(true);
      try {
        // Fetch all data in parallel for better performance
        const [requestData, approvalsData, posResponse] = await Promise.all([
          purchaseRequestsAPI.getById(requestId),
          approvalsAPI.getByRequestId(requestId).catch(() => [] as Approval[]),
          purchaseOrdersAPI.getAll({ request: requestId }).catch(() => ({ results: [] })),
        ]);

        // Set request data
        setRequest(requestData);

        // Set approvals data
        setAllApprovals(approvalsData);
        if (user?.role === 'APPROVER_L1' || user?.role === 'APPROVER_L2') {
          const userLevel = user.role === 'APPROVER_L1' ? 1 : 2;
          const approval = approvalsData.find(
            (a) => a.level === userLevel && a.status === 'PENDING'
          );
          setPendingApproval(approval || null);
        }

        // Set purchase order if request is approved and PO exists
        if (requestData.status === 'APPROVED' && posResponse.results?.length > 0) {
          setPurchaseOrder(posResponse.results[0]);
        } else {
          setPurchaseOrder(null);
        }
      } catch (error) {
        const { toastData } = handleAndFormatError(error);
        toast(toastData);
        navigate(getBackPath());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, toast]);

  // Submit for approval
  const handleSubmit = async () => {
    if (!request) return;

    setSubmitting(true);
    try {
      await purchaseRequestsAPI.submit(request.id);

      toast({
        title: 'Request submitted',
        description: 'Purchase request submitted for approval successfully',
      });

      navigate('/staff/requests');
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete request
  const handleDeleteConfirm = async () => {
    if (!request) return;

    setDeleting(true);
    try {
      await purchaseRequestsAPI.delete(request.id);

      toast({
        title: 'Request deleted',
        description: 'Purchase request deleted successfully',
      });

      navigate('/staff/requests');
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Show approve dialog
  const handleApproveClick = () => {
    setShowApproveDialog(true);
  };

  // Approve request
  const handleApproveConfirm = async () => {
    if (!pendingApproval) return;

    setProcessingApproval(true);
    try {
      await approvalsAPI.approve(pendingApproval.id);
      toast({
        title: 'Success',
        description: 'Request approved successfully!',
      });
      setShowApproveDialog(false);
      navigate(getBackPath());
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setProcessingApproval(false);
    }
  };

  // Show reject dialog
  const handleRejectClick = () => {
    setShowRejectDialog(true);
  };

  // Reject request
  const handleRejectConfirm = async () => {
    if (!pendingApproval) return;

    if (!rejectComments.trim()) {
      toast({
        title: 'Error',
        description: 'Rejection reason is required',
        variant: 'destructive',
      });
      return;
    }

    setProcessingApproval(true);
    try {
      await approvalsAPI.reject(pendingApproval.id, rejectComments);
      toast({
        title: 'Success',
        description: 'Request rejected',
      });
      setShowRejectDialog(false);
      setRejectComments('');
      navigate(getBackPath());
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setProcessingApproval(false);
    }
  };

  // Download PO PDF
  const handleDownloadPO = async () => {
    if (!purchaseOrder) return;

    setDownloadingPO(true);
    try {
      await purchaseOrdersAPI.triggerDownload(purchaseOrder.id, purchaseOrder.po_number);
      toast({
        title: 'Success',
        description: `Downloading ${purchaseOrder.po_number}.pdf`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPO(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Currency formatter
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
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const canEdit = request.status === 'DRAFT';

  const isApprover = user?.role === 'APPROVER_L1' || user?.role === 'APPROVER_L2';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate(getBackPath())}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isApprover ? 'Back to Dashboard' : 'Back to Requests'}
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{request.title}</h1>
              <p className="text-sm text-gray-500 mt-1">PR-{request.id}</p>
            </div>
            <div className="flex space-x-2">
              {/* Staff actions */}
              {canEdit && !isApprover && (
                <>
                  <Button
                    onClick={() => navigate(`/staff/requests/${request.id}/edit`)}
                    variant="outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              {/* Approver actions */}
              {isApprover && pendingApproval && (
                <>
                  <Button
                    onClick={handleApproveClick}
                    disabled={processingApproval}
                  >
                    {processingApproval ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleRejectClick}
                    disabled={processingApproval}
                    variant="outline"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Request Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Status</p>
                <StatusBadge status={request.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatCurrency(request.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requester</p>
                <p className="text-gray-900">
                  {request.requester.first_name} {request.requester.last_name}
                </p>
                <p className="text-sm text-gray-500">{request.requester.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{formatDate(request.created_at)}</p>
              </div>
              {request.submitted_at && (
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="text-gray-900">{formatDate(request.submitted_at)}</p>
                </div>
              )}
            </div>

            {request.description && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Description</p>
                <p className="text-gray-900">{request.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proforma Document - Show prominently for approvers to verify items */}
        {request.document_file && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Proforma Document</CardTitle>
                {isApprover && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                    Please verify items match this document
                  </span>
                )}
              </div>
              <CardDescription>
                {isApprover
                  ? 'Review this proforma invoice to verify the requested items and amounts are accurate'
                  : 'The original proforma invoice uploaded with this request'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Document Preview */}
                <div className="border rounded-lg overflow-hidden bg-white">
                  {request.document_file.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-4">PDF Document</p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => window.open(request.document_file!, '_blank')}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View PDF
                        </Button>
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = request.document_file!;
                            link.download = `proforma-PR-${request.id}.pdf`;
                            link.click();
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Image Preview */}
                      <img
                        src={request.document_file}
                        alt="Proforma Document"
                        className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(request.document_file!, '_blank')}
                      />
                      {/* Overlay actions */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            onClick={() => window.open(request.document_file!, '_blank')}
                            variant="secondary"
                            size="sm"
                            className="bg-white/90 hover:bg-white"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Full Size
                          </Button>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = request.document_file!;
                              link.download = `proforma-PR-${request.id}`;
                              link.click();
                            }}
                            variant="secondary"
                            size="sm"
                            className="bg-white/90 hover:bg-white"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification Notice for Approvers */}
                {isApprover && pendingApproval && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">
                      Verification Required
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Please compare the items listed below with this proforma document to ensure:
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 list-disc list-inside space-y-1">
                      <li>Item descriptions match the proforma</li>
                      <li>Quantities are accurate</li>
                      <li>Unit prices are correct</li>
                      <li>Total amount matches the proforma invoice</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Items ({request.items.length})</CardTitle>
            <CardDescription>
              List of items in this purchase request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.items.map((item, index) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.description}</h4>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(calculateSubtotal(item))}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-900">
                        {item.quantity} {item.unit_of_measure || 'unit'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Unit Price</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Approval Timeline - Show if request has been submitted */}
        {request.status !== 'DRAFT' && allApprovals.length > 0 && (
          <ApprovalTimeline approvals={allApprovals} requestStatus={request.status} />
        )}

        {/* Purchase Order - Show if request is approved and PO exists */}
        {purchaseOrder && request.status === 'APPROVED' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Purchase Order Generated</CardTitle>
              <CardDescription>
                A purchase order has been automatically generated for this approved request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">PO Number</p>
                    <p className="text-2xl font-semibold text-gray-900 font-mono">
                      {purchaseOrder.po_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Generated on {new Date(purchaseOrder.generated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {purchaseOrder.pdf_file ? (
                      <>
                        <span className="text-xs text-gray-500 mb-1">PDF Ready</span>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setShowPOPreview(true)}
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview PDF
                          </Button>
                          <Button
                            onClick={handleDownloadPO}
                            disabled={downloadingPO}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {downloadingPO ? 'Downloading...' : 'Download'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500 mb-1">PDF Generating...</span>
                        <Button
                          disabled
                          variant="outline"
                          className="opacity-50"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF Not Ready
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        itemName={request?.title || 'this request'}
        itemType="purchase request"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />

      {/* Approve Confirmation Dialog */}
      {showApproveDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={() => !processingApproval && setShowApproveDialog(false)}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Approve Purchase Request</CardTitle>
                <CardDescription>
                  Confirm approval of this purchase request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    You are about to approve <span className="font-semibold">"{request?.title}"</span> for{' '}
                    <span className="font-semibold">
                      {formatCurrency(request?.total_amount || 0)}
                    </span>.
                  </p>
                  <div className="bg-gray-100 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-700">
                      {user?.role === 'APPROVER_L1'
                        ? 'This will move the request to Level 2 approval.'
                        : 'This will mark the request as fully approved and ready for processing.'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to proceed with approval?
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  onClick={() => setShowApproveDialog(false)}
                  variant="outline"
                  disabled={processingApproval}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveConfirm}
                  disabled={processingApproval}
                >
                  {processingApproval ? 'Approving...' : 'Approve Request'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={() => !processingApproval && setShowRejectDialog(false)}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Reject Purchase Request</CardTitle>
                <CardDescription>
                  Please provide a reason for rejection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label htmlFor="reject-comments" className="text-sm font-medium text-gray-700">
                    Rejection Reason *
                  </label>
                  <Textarea
                    id="reject-comments"
                    placeholder="Enter the reason for rejecting this request..."
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    rows={4}
                    disabled={processingApproval}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    This information will be shared with the requester.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectComments('');
                  }}
                  variant="outline"
                  disabled={processingApproval}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectConfirm}
                  disabled={processingApproval || !rejectComments.trim()}
                >
                  {processingApproval ? 'Rejecting...' : 'Reject Request'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}

      {/* PDF Preview Modal */}
      {purchaseOrder && purchaseOrder.pdf_file && showPOPreview && (
        <POPreviewModal
          isOpen={showPOPreview}
          onClose={() => setShowPOPreview(false)}
          pdfUrl={purchaseOrder.pdf_file}
          poNumber={purchaseOrder.po_number}
          onDownload={handleDownloadPO}
        />
      )}
    </div>
  );
};

export default RequestDetailPage;

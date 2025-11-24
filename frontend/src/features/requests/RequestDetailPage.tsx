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
import { ArrowLeft, Send, Trash2, Edit, DollarSign, AlertTriangle, CheckCircle2, XCircle, FileText, Download, Eye, ExternalLink, FileImage } from 'lucide-react';

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

  // Fetch request details
  useEffect(() => {
    const fetchRequest = async () => {
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
        const data = await purchaseRequestsAPI.getById(requestId);
        setRequest(data);

        // Fetch all approvals for this request to show timeline
        try {
          const approvals = await approvalsAPI.getByRequestId(requestId);
          setAllApprovals(approvals);

          // If user is an approver, find their pending approval
          if (user?.role === 'APPROVER_L1' || user?.role === 'APPROVER_L2') {
            const userLevel = user.role === 'APPROVER_L1' ? 1 : 2;
            const approval = approvals.find(
              (a) => a.level === userLevel && a.status === 'PENDING'
            );
            setPendingApproval(approval || null);
          }
        } catch (err) {
          // Approvals might not exist yet for draft requests, ignore error
          console.log('No approvals found for this request');
        }

        // Fetch purchase order if request is approved
        if (data.status === 'APPROVED') {
          try {
            const posResponse = await purchaseOrdersAPI.getAll({ request: requestId });
            if (posResponse.results && posResponse.results.length > 0) {
              setPurchaseOrder(posResponse.results[0]);
            } else {
              setPurchaseOrder(null);
            }
          } catch (err) {
            console.log('No purchase order found for this request');
            setPurchaseOrder(null);
          }
        }
      } catch (error) {
        const { toastData } = handleAndFormatError(error);
        toast(toastData);
        navigate(getBackPath());
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading request details...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
              <p className="text-gray-600 mt-1">PR-{request.id}</p>
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
                    variant="destructive"
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
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {processingApproval ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleRejectClick}
                    disabled={processingApproval}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
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
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
                <StatusBadge status={request.status} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <div className="flex items-center text-2xl font-bold text-green-600">
                  <DollarSign className="h-6 w-6" />
                  {typeof request.total_amount === 'number'
                    ? request.total_amount.toFixed(2)
                    : request.total_amount}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Requester</p>
                <p className="text-lg">
                  {request.requester.first_name} {request.requester.last_name}
                </p>
                <p className="text-sm text-gray-600">{request.requester.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg">{formatDate(request.created_at)}</p>
              </div>
              {request.submitted_at && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-lg">{formatDate(request.submitted_at)}</p>
                </div>
              )}
            </div>

            {request.description && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                <p className="text-gray-900">{request.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proforma Document - Show prominently for approvers to verify items */}
        {request.document_file && (
          <Card className="mb-6 border-2 border-amber-200 bg-amber-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileImage className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900">Proforma Document</CardTitle>
                </div>
                {isApprover && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
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
                      <FileText className="h-16 w-16 text-red-500 mb-3" />
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
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          Verification Required
                        </p>
                        <p className="text-sm text-amber-800 mt-1">
                          Please compare the items listed below with this proforma document to ensure:
                        </p>
                        <ul className="text-sm text-amber-800 mt-2 list-disc list-inside space-y-1">
                          <li>Item descriptions match the proforma</li>
                          <li>Quantities are accurate</li>
                          <li>Unit prices are correct</li>
                          <li>Total amount matches the proforma invoice</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items ({request.items.length})</CardTitle>
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
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-xl font-bold text-green-600">
                        <DollarSign className="h-5 w-5" />
                        {calculateSubtotal(item).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-gray-600">Quantity</p>
                      <p className="font-medium">
                        {item.quantity} {item.unit_of_measure || 'unit'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Unit Price</p>
                      <p className="font-medium">
                        ${typeof item.unit_price === 'number'
                          ? item.unit_price.toFixed(2)
                          : item.unit_price}
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
              <CardTitle>Purchase Order Generated</CardTitle>
              <CardDescription>
                A purchase order has been automatically generated for this approved request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 rounded-full p-3">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">PO Number</p>
                      <p className="text-2xl font-bold text-blue-900 font-mono">
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
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {purchaseOrder.pdf_file ? (
                      <>
                        <div className="flex items-center text-xs text-green-600 mb-1">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          PDF Ready
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setShowPOPreview(true)}
                            variant="outline"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview PDF
                          </Button>
                          <Button
                            onClick={handleDownloadPO}
                            disabled={downloadingPO}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {downloadingPO ? 'Downloading...' : 'Download'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center text-xs text-yellow-600 mb-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          PDF Generating...
                        </div>
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
      {showDeleteDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={() => !deleting && setShowDeleteDialog(false)}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <CardTitle>Delete Purchase Request</CardTitle>
                </div>
                <CardDescription>
                  This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">"{request?.title}"</span>?
                  This will permanently remove the request and all associated items.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  onClick={() => setShowDeleteDialog(false)}
                  variant="outline"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="destructive"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}

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
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <CardTitle>Approve Purchase Request</CardTitle>
                </div>
                <CardDescription>
                  Confirm approval of this purchase request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    You are about to approve <span className="font-semibold">"{request?.title}"</span> for{' '}
                    <span className="font-semibold text-green-600">
                      ${typeof request?.total_amount === 'number'
                        ? request.total_amount.toFixed(2)
                        : request?.total_amount}
                    </span>.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-800">
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
                  className="bg-green-600 hover:bg-green-700"
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
                <div className="flex items-center space-x-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <CardTitle>Reject Purchase Request</CardTitle>
                </div>
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
                  variant="destructive"
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

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError } from '@/utils/errorHandler';
import { calculateSubtotal } from '@/utils/calculateSubtotal';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { PurchaseRequest } from '@/types';
import { ArrowLeft, Send, Trash2, Edit, DollarSign, AlertTriangle } from 'lucide-react';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        navigate('/staff/requests');
        return;
      }

      setLoading(true);
      try {
        const data = await purchaseRequestsAPI.getById(requestId);
        setRequest(data);
      } catch (error) {
        const { toastData } = handleAndFormatError(error);
        toast(toastData);
        navigate('/staff/requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/staff/requests')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
              <p className="text-gray-600 mt-1">PR-{request.id}</p>
            </div>
            <div className="flex space-x-2">
              {canEdit && (
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
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-semibold">{request.status_display || request.status}</p>
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

        {/* Items */}
        <Card>
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
    </div>
  );
};

export default RequestDetailPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalsAPI, Approval, ApprovalStats } from '../../api/approvals';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { StatsGridSkeleton, TableSkeleton } from '@/components/common/LoadingSkeletons';
import { NoPendingApprovalsEmptyState, NoReviewedApprovalsEmptyState } from '@/components/common/EmptyState';
import { Eye, Search, RefreshCcw, Loader2 } from 'lucide-react';

type TabType = 'pending' | 'reviewed';

export const ApproverDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [reviewedApprovals, setReviewedApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [rejectComments, setRejectComments] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingData, reviewedData, statsData] = await Promise.all([
        approvalsAPI.pending(),
        approvalsAPI.myApprovals(),
        approvalsAPI.stats(),
      ]);
      setPendingApprovals(pendingData);
      setReviewedApprovals(reviewedData);
      setStats(statsData);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (approval: Approval) => {
    try {
      setActionLoading(approval.id);
      await approvalsAPI.approve(approval.id);
      toast({
        title: 'Success',
        description: `Request PR-${approval.request} has been approved`,
      });
      loadDashboardData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (approval: Approval) => {
    setSelectedApproval(approval);
    setRejectComments('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectComments.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(selectedApproval.id);
      await approvalsAPI.reject(selectedApproval.id, rejectComments);
      toast({
        title: 'Success',
        description: `Request PR-${selectedApproval.request} has been rejected`,
      });
      setRejectDialogOpen(false);
      setSelectedApproval(null);
      setRejectComments('');
      loadDashboardData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-emerald-50 text-emerald-700',
      REJECTED: 'bg-red-50 text-red-700',
      PENDING: 'bg-amber-50 text-amber-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {status}
      </span>
    );
  };

  const filteredPending = pendingApprovals.filter(
    (a) =>
      a.request_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `PR-${a.request}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReviewed = reviewedApprovals.filter(
    (a) =>
      a.request_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `PR-${a.request}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentApprovals = activeTab === 'pending' ? filteredPending : filteredReviewed;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Approver Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.role === 'APPROVER_L1' ? 'Level 1' : 'Level 2'} Approval Queue
            </p>
          </div>
          <Button onClick={loadDashboardData} variant="outline" disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="mb-8">
            <StatsGridSkeleton count={4} />
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-l-4 border-l-amber-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.pending_count}</p>
                <p className="text-xs text-gray-400 mt-1">Awaiting your action</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(stats.pending_amount)}</p>
                <p className="text-xs text-gray-400 mt-1">Total value in queue</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">You Approved</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.my_approved}</p>
                <p className="text-xs text-gray-400 mt-1">All time approvals</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-gray-400">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Today's Activity</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.today_processed}</p>
                <p className="text-xs text-gray-400 mt-1">Processed today</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({pendingApprovals.length})
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'reviewed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviewed ({reviewedApprovals.length})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by ID, title, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {activeTab === 'pending' ? 'Pending Approvals' : 'Reviewed Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={activeTab === 'pending' ? 6 : 7} />
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && currentApprovals.length === 0 && (
          activeTab === 'pending' ? (
            <NoPendingApprovalsEmptyState />
          ) : (
            <NoReviewedApprovalsEmptyState />
          )
        )}

        {/* Approvals Table */}
        {!loading && currentApprovals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {activeTab === 'pending' ? 'Pending Approvals' : 'Reviewed Requests'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'pending'
                  ? 'Review and take action on purchase requests'
                  : 'Your approval history'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>{activeTab === 'pending' ? 'Created' : 'Processed'}</TableHead>
                    {activeTab === 'reviewed' && <TableHead>Status</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">PR-{approval.request}</TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-gray-900 truncate block">{approval.request_title}</span>
                      </TableCell>
                      <TableCell className="text-gray-600">{approval.requester_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(approval.request_total)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(
                          activeTab === 'pending'
                            ? approval.created_at
                            : approval.processed_at || approval.updated_at
                        )}
                      </TableCell>
                      {activeTab === 'reviewed' && (
                        <TableCell>{getStatusBadge(approval.status)}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleQuickApprove(approval)}
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === approval.id}
                              >
                                {actionLoading === approval.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Approve'
                                )}
                              </Button>
                              <Button
                                onClick={() => openRejectDialog(approval)}
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === approval.id}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            onClick={() => navigate(`/approver/requests/${approval.request}`)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                {selectedApproval && (
                  <>
                    Rejecting PR-{selectedApproval.request}: {selectedApproval.request_title}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Reason for Rejection
              </label>
              <Textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Please provide a reason..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectComments.trim() || actionLoading !== null}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Reject Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

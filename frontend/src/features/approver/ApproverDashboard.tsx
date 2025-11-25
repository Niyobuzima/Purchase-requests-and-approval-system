import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalsAPI, Approval, ApprovalStats } from '../../api/approvals';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import {
  User,
  DollarSign,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  RefreshCcw,
  Loader2,
  FileText,
  Calendar,
} from 'lucide-react';

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

  // Quick action states
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  // Filter approvals based on search
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approver Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'APPROVER_L1' ? 'Level 1' : 'Level 2'} Approval Queue
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_count}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.pending_amount)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Total pending value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.my_approved}</div>
              <p className="text-xs text-gray-600 mt-1">Requests you approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.today_processed}</div>
              <p className="text-xs text-gray-600 mt-1">Processed today</p>
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
            <Clock className="h-4 w-4 inline mr-2" />
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
            <CheckCircle className="h-4 w-4 inline mr-2" />
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && currentApprovals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            {activeTab === 'pending' ? (
              <>
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">
                  There are no purchase requests waiting for your approval.
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviewed requests</h3>
                <p className="text-gray-600">
                  You haven't reviewed any requests yet.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approvals Table */}
      {!loading && currentApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
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
                  <TableRow key={approval.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">PR-{approval.request}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium text-gray-900 truncate">
                        {approval.request_title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-1" />
                        {approval.requester_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end font-semibold text-green-600">
                        {formatCurrency(approval.request_total)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatDate(
                          activeTab === 'pending'
                            ? approval.created_at
                            : approval.processed_at || approval.updated_at
                        )}
                      </span>
                    </TableCell>
                    {activeTab === 'reviewed' && (
                      <TableCell>{getStatusBadge(approval.status)}</TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {activeTab === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleQuickApprove(approval)}
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={actionLoading === approval.id}
                            >
                              {actionLoading === approval.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() => openRejectDialog(approval)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={actionLoading === approval.id}
                            >
                              <XCircle className="h-4 w-4" />
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
                  You are about to reject <strong>PR-{selectedApproval.request}</strong>:{' '}
                  {selectedApproval.request_title}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Reason for Rejection *
            </label>
            <Textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Please provide a reason for rejecting this request..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={!rejectComments.trim() || actionLoading !== null}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

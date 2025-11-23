import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalsAPI, Approval } from '../../api/approvals';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { User, DollarSign, Clock, Eye } from 'lucide-react';

export const ApproverDashboard: React.FC = () => {
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await approvalsAPI.pending();
      setPendingApprovals(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load approvals',
        variant: 'destructive',
      });
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Pending Approvals - {user?.role === 'APPROVER_L1' ? 'Level 1' : 'Level 2'}
          </h1>
          <p className="text-gray-600 mt-1">Review and approve or reject purchase requests</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading approvals...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && pendingApprovals.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pending approvals
              </h3>
              <p className="text-gray-600">
                There are no purchase requests waiting for your approval.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Approvals Table */}
        {!loading && pendingApprovals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and take action on purchase requests
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
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((approval) => (
                    <TableRow key={approval.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        PR-{approval.request}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium text-gray-900">{approval.request_title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-1" />
                          {approval.requester_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end font-semibold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          {parseFloat(approval.request_total).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(approval.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`/approver/requests/${approval.request}`)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

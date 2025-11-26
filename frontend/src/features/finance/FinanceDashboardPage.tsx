import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { analyticsAPI, type DashboardStats, type SpendingByVendor, type MonthlySpending, type PendingReceipt, type RequestStatusDistribution } from '@/api/analytics';
import { getBasePath } from '@/utils/pathHelpers';
import { ExportModal } from '@/components/finance/ExportModal';
import { StatsGridSkeleton, TableSkeleton, ListSkeleton } from '@/components/common/LoadingSkeletons';
import { Download, RefreshCcw } from 'lucide-react';

export const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spendingByVendor, setSpendingByVendor] = useState<SpendingByVendor[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<RequestStatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [statsData, spendingData, receiptsData, distributionData] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        analyticsAPI.getSpendingAnalytics(),
        analyticsAPI.getPendingReceipts(),
        analyticsAPI.getStatusDistribution(),
      ]);

      // Handle potential response format variations (with or without wrapper)
      // statsData could be { stats: {...} } or directly { total_spent, ... }
      const resolvedStats = statsData?.stats || (statsData?.total_spent !== undefined ? statsData : null);
      setStats(resolvedStats);
      setSpendingByVendor(spendingData?.spending_by_vendor || []);
      setMonthlySpending(spendingData?.monthly_spending || []);
      setPendingReceipts(receiptsData?.receipts || []);
      setStatusDistribution(distributionData?.distribution || []);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.response?.data?.error || 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string, display: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700',
      DISCREPANCY: 'bg-red-50 text-red-700',
      VALIDATED: 'bg-emerald-50 text-emerald-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {display}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor spending, approvals, and receipt validations</p>
        </div>
        <Button onClick={() => setExportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Stats Cards */}
      {loading ? (
        <div className="mb-8">
          <StatsGridSkeleton count={4} />
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(stats.total_spent)}
              </p>
              <p className="text-xs text-gray-400 mt-1">All approved requests</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.pending_approvals}</p>
              <p className="text-xs text-gray-400 mt-1">In approval queue</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Active POs</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.active_pos}</p>
              <p className="text-xs text-gray-400 mt-1">Open purchase orders</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Pending Receipts</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.pending_receipts}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting validation</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spending by Vendor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Vendors by Spending</CardTitle>
            <CardDescription>Largest expenditures by vendor</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton items={5} />
            ) : spendingByVendor.length > 0 ? (
              <div className="space-y-3">
                {spendingByVendor.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{vendor.vendor_name}</p>
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(vendor.total / spendingByVendor[0].total) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-sm text-gray-900">
                      {formatCurrency(vendor.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No spending data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Monthly Spending Trend</CardTitle>
            <CardDescription>Spending over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton items={6} />
            ) : monthlySpending.length > 0 ? (
              <div className="space-y-3">
                {monthlySpending.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(month.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No monthly data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Status Distribution */}
      {statusDistribution.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
            <CardDescription>Overview of all purchase request statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusDistribution.map((status) => (
                <div key={status.status} className="p-4 border rounded-lg bg-gray-50">
                  <div className="text-2xl font-bold text-gray-900">{status.count}</div>
                  <div className="text-sm text-gray-600 mt-1">{status.status_display}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Receipts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Receipts Pending Review</CardTitle>
              <CardDescription>Receipts that require Finance validation</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : pendingReceipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Request Title</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discrepancies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.po_number}</TableCell>
                    <TableCell>{receipt.request_title}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(receipt.total_amount)}</TableCell>
                    <TableCell className="text-gray-600">{receipt.uploaded_by_name}</TableCell>
                    <TableCell className="text-gray-500">{formatDate(receipt.uploaded_at)}</TableCell>
                    <TableCell>
                      {getStatusBadge(receipt.validation_status, receipt.validation_status_display)}
                    </TableCell>
                    <TableCell>
                      {receipt.discrepancy_count > 0 ? (
                        <span className="font-medium text-gray-900">
                          {receipt.discrepancy_count}
                        </span>
                      ) : (
                        <span className="text-gray-500">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`${getBasePath('FINANCE')}/receipts/${receipt.id}/validate`)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-900 font-medium">All Clear</p>
              <p className="text-sm text-gray-500 mt-1">No receipts pending review at the moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Modal */}
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { analyticsAPI, type DashboardStats, type SpendingByVendor, type MonthlySpending, type PendingReceipt, type RequestStatusDistribution } from '@/api/analytics';
import { getBasePath } from '@/utils/pathHelpers';
import { ExportModal } from '@/components/finance/ExportModal';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Loader2,
  Download,
} from 'lucide-react';

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

      setStats(statsData.stats);
      setSpendingByVendor(spendingData.spending_by_vendor);
      setMonthlySpending(spendingData.monthly_spending);
      setPendingReceipts(receiptsData.receipts);
      setStatusDistribution(distributionData.distribution);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load dashboard data',
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'default';
      case 'DISCREPANCY':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor spending, approvals, and receipt validations</p>
        </div>
        <Button onClick={() => setExportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Spent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.total_spent)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Approved requests</p>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_approvals}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          {/* Active Purchase Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active POs</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.active_pos}</div>
              <p className="text-xs text-gray-600 mt-1">Purchase orders</p>
            </CardContent>
          </Card>

          {/* Pending Receipts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_receipts}</div>
              <p className="text-xs text-gray-600 mt-1">Require review</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spending by Vendor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Top Vendors by Spending</span>
            </CardTitle>
            <CardDescription>Largest expenditures by vendor</CardDescription>
          </CardHeader>
          <CardContent>
            {spendingByVendor.length > 0 ? (
              <div className="space-y-3">
                {spendingByVendor.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{vendor.vendor_name}</p>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(vendor.total / spendingByVendor[0].total) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-sm text-green-600">
                      {formatCurrency(vendor.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No spending data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Monthly Spending Trend</span>
            </CardTitle>
            <CardDescription>Spending over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySpending.length > 0 ? (
              <div className="space-y-3">
                {monthlySpending.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(month.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
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
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Receipts Pending Review</span>
              </CardTitle>
              <CardDescription>Receipts that require Finance validation</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingReceipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Request Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discrepancies</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.po_number}</TableCell>
                    <TableCell>{receipt.request_title}</TableCell>
                    <TableCell>{formatCurrency(receipt.total_amount)}</TableCell>
                    <TableCell>{receipt.uploaded_by_name}</TableCell>
                    <TableCell>{formatDate(receipt.uploaded_at)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(receipt.validation_status)}>
                        {receipt.validation_status_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {receipt.discrepancy_count > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {receipt.discrepancy_count}
                        </span>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell>
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
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No receipts pending review at the moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Modal */}
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { receiptsAPI } from '@/api/receipts';
import type { Receipt } from '@/types';
import {
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await receiptsAPI.getAll({});
      setReceipts(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      PENDING: {
        variant: 'secondary',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending Validation',
      },
      MATCHED: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Matched',
      },
      APPROVED: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Approved',
      },
      DISCREPANCY: {
        variant: 'outline',
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Has Discrepancies',
      },
    };

    const badge = badges[status] || badges.PENDING;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1 w-fit">
        {badge.icon}
        <span>{badge.label}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = searchTerm === '' ||
      receipt.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.id.toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || receipt.validation_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getBasePath = () => {
    if (user?.role === 'FINANCE') {
      return '/finance';
    }
    return '/staff';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">
            View and validate all uploaded receipts
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by receipt ID or PO number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('PENDING')}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'MATCHED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('MATCHED')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Matched
                </Button>
                <Button
                  variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('APPROVED')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'DISCREPANCY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('DISCREPANCY')}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Discrepancies
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{receipts.length}</p>
                <p className="text-sm text-gray-600">Total Receipts</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-900">
                  {receipts.filter(r => r.validation_status === 'PENDING').length}
                </p>
                <p className="text-sm text-yellow-800">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-900">
                  {receipts.filter(r => r.validation_status === 'MATCHED' || r.validation_status === 'APPROVED').length}
                </p>
                <p className="text-sm text-green-800">Matched/Approved</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-900">
                  {receipts.filter(r => r.validation_status === 'DISCREPANCY').length}
                </p>
                <p className="text-sm text-orange-800">Discrepancies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {filteredReceipts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No receipts found
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Receipts will appear here once they are uploaded'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Receipts Table */}
        {filteredReceipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Receipts ({filteredReceipts.length})</CardTitle>
              <CardDescription>
                Click on a receipt to view details and validate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Request Title</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discrepancies</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-mono">RCP-{receipt.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {receipt.purchase_order_number || `PO-${receipt.purchase_order}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {receipt.request_title || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {receipt.uploaded_by_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(receipt.uploaded_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(receipt.validation_status)}
                      </TableCell>
                      <TableCell>
                        {receipt.discrepancies && receipt.discrepancies.length > 0 ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                            <span>{receipt.discrepancies.length}</span>
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {receipt.total_amount ? (
                          <div className="flex items-center justify-end space-x-1 font-semibold text-green-600">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(receipt.total_amount)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`${getBasePath()}/receipts/${receipt.id}/validate`)}
                          variant="default"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {receipt.validation_status === 'PENDING' ? 'Review' : 'View'}
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI, PurchaseOrder } from '../../api/purchaseOrders';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Download, Eye, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  const loadPurchaseOrders = async () => {
    try {
      const data = await purchaseOrdersAPI.getAll();
      setPurchaseOrders(data);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load purchase orders',
        variant: 'destructive',
      });
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (po: PurchaseOrder) => {
    if (!po.pdf_file) {
      toast({
        title: 'Error',
        description: 'PDF file not available',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(po.id);
    try {
      await purchaseOrdersAPI.triggerDownload(po.id, po.po_number);
      toast({
        title: 'Success',
        description: `Downloading ${po.po_number}.pdf`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">View and download generated purchase orders</p>
        </div>

        {/* Purchase Orders List */}
        {purchaseOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Yet</h3>
              <p className="text-gray-600">
                Purchase orders will appear here after requests are fully approved
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Purchase Orders ({purchaseOrders.length})</CardTitle>
              <CardDescription>
                Click on a purchase order to view details or download the PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-mono font-semibold text-blue-600">
                            {po.po_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={po.request_title}>
                          {po.request_title}
                        </div>
                      </TableCell>
                      <TableCell>{po.requester_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 font-semibold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {(() => {
                              const val = Number(po.request_total);
                              return Number.isFinite(val) ? val.toFixed(2) : '0.00';
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(po.generated_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <Button
                            onClick={() => navigate(`/staff/requests/${po.request}`)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Request
                          </Button>
                          {po.pdf_file ? (
                            <Button
                              onClick={() => handleDownload(po)}
                              disabled={downloading === po.id}
                              variant="default"
                              size="sm"
                              className="relative"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {downloading === po.id ? 'Downloading...' : 'Download PDF'}
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center text-xs text-yellow-600 px-3 py-1 bg-yellow-50 rounded border border-yellow-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                PDF Processing
                              </div>
                            </div>
                          )}
                        </div>
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

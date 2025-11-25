import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { reportsAPI, ExportLog } from '@/api/reports';
import { handleAndFormatError } from '@/utils/errorHandler';
import { TableSkeleton } from '@/components/common/LoadingSkeletons';
import { ArrowLeft } from 'lucide-react';

export const ExportHistoryPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await reportsAPI.getExportHistory();
      setLogs(data);
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Type badge with subtle colors
  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      PURCHASE_ORDERS: 'bg-blue-50 text-blue-700',
      RECEIPTS: 'bg-purple-50 text-purple-700',
      SPENDING_SUMMARY: 'bg-emerald-50 text-emerald-700',
      APPROVAL_TIMELINE: 'bg-amber-50 text-amber-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  // Format badge with subtle colors
  const getFormatBadge = (format: string) => {
    return format === 'CSV' ? (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        CSV
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
        PDF
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/finance/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Export History</h1>
            <p className="text-sm text-gray-500 mt-1">
              View your recent report downloads
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Exports</CardTitle>
              <CardDescription>Last 20 report downloads</CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={7} />
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Exports</CardTitle>
              <CardDescription>Last 20 report downloads</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900 font-medium">No export history yet</p>
                  <p className="text-sm text-gray-500 mt-1">Generate your first report from the dashboard</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getTypeBadge(log.export_type)}</TableCell>
                        <TableCell>{getFormatBadge(log.export_format)}</TableCell>
                        <TableCell className="text-gray-600">
                          {log.start_date || 'All'} - {log.end_date || 'All'}
                        </TableCell>
                        <TableCell className="font-medium">{log.record_count}</TableCell>
                        <TableCell className="text-gray-600">
                          {log.file_size_mb ? `${log.file_size_mb} MB` : '-'}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate(log.generated_at)}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {log.download_count}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { FileText, Calendar, ArrowLeft } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { reportsAPI, ExportLog } from '@/api/reports';
import { handleAndFormatError } from '@/utils/errorHandler';

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

  const getTypeBadge = (type: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      PURCHASE_ORDERS: 'default',
      RECEIPTS: 'secondary',
      SPENDING_SUMMARY: 'outline',
      APPROVAL_TIMELINE: 'outline',
    };
    return <Badge variant={colors[type] || 'default'}>{type.replace(/_/g, ' ')}</Badge>;
  };

  const getFormatBadge = (format: string) => {
    return format === 'CSV' ? (
      <Badge variant="outline">CSV</Badge>
    ) : (
      <Badge variant="destructive">PDF</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading export history...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/finance/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Export History</h1>
          <p className="text-muted-foreground mt-2">
            View your recent report downloads
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Exports
          </CardTitle>
          <CardDescription>Last 20 report downloads</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No export history yet. Generate your first report!
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
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {log.start_date || 'All'} - {log.end_date || 'All'}
                      </div>
                    </TableCell>
                    <TableCell>{log.record_count}</TableCell>
                    <TableCell>
                      {log.file_size_mb ? `${log.file_size_mb} MB` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.generated_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.download_count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

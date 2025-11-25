import React, { useState } from 'react';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { reportsAPI, ExportRequest } from '@/api/reports';
import { handleAndFormatError } from '@/utils/errorHandler';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<ExportRequest['export_type']>('PURCHASE_ORDERS');
  const [exportFormat, setExportFormat] = useState<ExportRequest['export_format']>('CSV');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  const handleExport = async () => {
    setLoading(true);

    try {
      const params: ExportRequest = {
        export_type: exportType,
        export_format: exportFormat,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status_filter: statusFilter || undefined,
        vendor_filter: vendorFilter || undefined,
      };

      const blob = await reportsAPI.exportData(params);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on type and format
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${exportType.toLowerCase()}_${timestamp}.${exportFormat.toLowerCase()}`;
      link.setAttribute('download', filename);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Your ${exportFormat} file has been downloaded.`,
      });

      onOpenChange(false);
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  const showVendorFilter = exportType === 'PURCHASE_ORDERS';

  // Update format when type changes
  React.useEffect(() => {
    if (exportType === 'SPENDING_SUMMARY') {
      setExportFormat('PDF');
    } else {
      setExportFormat('CSV');
    }
  }, [exportType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Select export options and download your report
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Export Type */}
          <div className="grid gap-2">
            <Label htmlFor="export-type">Report Type</Label>
            <Select
              value={exportType}
              onValueChange={(value) => setExportType(value as ExportRequest['export_type'])}
            >
              <SelectTrigger id="export-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PURCHASE_ORDERS">Purchase Orders</SelectItem>
                <SelectItem value="RECEIPTS">Receipts</SelectItem>
                <SelectItem value="SPENDING_SUMMARY">Spending Summary</SelectItem>
                <SelectItem value="APPROVAL_TIMELINE">Approval Timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Format */}
          <div className="grid gap-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportRequest['export_format'])}
              disabled={exportType === 'SPENDING_SUMMARY'}
            >
              <SelectTrigger id="export-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {exportType === 'SPENDING_SUMMARY' ? (
                  <SelectItem value="PDF">PDF Report</SelectItem>
                ) : (
                  <SelectItem value="CSV">CSV Spreadsheet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid gap-4">
            <Label className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filters (Optional)
            </Label>

            <div className="grid gap-2">
              <Label htmlFor="status-filter" className="text-sm text-muted-foreground">
                Status
              </Label>
              <Select
                value={statusFilter || 'ALL'}
                onValueChange={(value) => setStatusFilter(value === 'ALL' ? '' : value)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PENDING_L1">Pending L1</SelectItem>
                  <SelectItem value="PENDING_L2">Pending L2</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED_L1">Rejected L1</SelectItem>
                  <SelectItem value="REJECTED_L2">Rejected L2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showVendorFilter && (
              <div className="grid gap-2">
                <Label htmlFor="vendor-filter" className="text-sm text-muted-foreground">
                  Vendor
                </Label>
                <Input
                  id="vendor-filter"
                  placeholder="Search by vendor name"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

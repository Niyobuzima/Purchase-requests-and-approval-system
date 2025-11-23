import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PDFViewer } from './PDFViewer';

interface POPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  poNumber: string;
  onDownload: () => void;
}

export const POPreviewModal: React.FC<POPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  poNumber,
  onDownload,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-lg font-semibold">
            Purchase Order: {poNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <PDFViewer
            pdfUrl={pdfUrl}
            fileName={`${poNumber}.pdf`}
            onDownload={onDownload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

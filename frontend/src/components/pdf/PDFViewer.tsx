import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  fileName?: string;
  onDownload?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, fileName = 'document.pdf', onDownload }) => {
  const [loading, setLoading] = useState(true);

  const handlePrint = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-4 py-2 bg-gray-50 border-b space-x-2">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>

        {onDownload && (
          <Button variant="default" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )}
      </div>

      {/* PDF Display using iframe - simple and reliable */}
      <div className="flex-1 overflow-hidden bg-gray-100 relative">
        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={fileName}
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
};

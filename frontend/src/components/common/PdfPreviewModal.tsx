// src/components/common/PdfPreviewModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  subjectCode?: string;
  fileType?: string;
  year?: number;
  fileSize?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  subjectCode,
  fileType = 'PDF',
  year,
  fileSize,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setLoading(true);
      setHasError(false);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fileUrl, onClose]);

  if (!isOpen) return null;

  // Format the file url if needed (e.g. adding #toolbar=1)
  const isPdf = fileType.toUpperCase().includes('PDF') || fileType.toUpperCase() === 'PYQ' || fileUrl.toLowerCase().endsWith('.pdf');
  const embedUrl = isPdf && !fileUrl.includes('#') ? `${fileUrl}#toolbar=1&navpanes=0` : fileUrl;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 60));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 transition-all duration-300 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <FileText className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-2">
                {subjectCode && (
                  <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                    {subjectCode}
                  </span>
                )}
                <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  {fileType}
                </span>
                {year && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    Year {year}
                  </span>
                )}
                {fileSize && (
                  <span className="text-[11px] text-slate-400">
                    · {fileSize}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5 max-w-xl" title={title}>
                {title}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 60}
                className="p-1 hover:text-slate-900 disabled:opacity-30 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center font-mono text-[11px] font-semibold">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="p-1 hover:text-slate-900 disabled:opacity-30 rounded"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Direct Open in new tab */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="Open full document in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            {/* Download */}
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition"
              title="Download Document"
            >
              <Download className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition hidden sm:inline-flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Close Preview (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div className="relative flex-1 bg-slate-900 overflow-auto flex items-center justify-center">
          {loading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white z-10">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-400 mb-3" />
              <p className="text-xs text-slate-300">Rendering document preview...</p>
            </div>
          )}

          {hasError ? (
            <div className="p-8 text-center max-w-md bg-white rounded-2xl border border-slate-200 m-4 shadow-xl">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Direct In-Browser Preview Unavailable</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                The document source may restrict embedded frame viewing. You can view or download it directly using the buttons below.
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Open in New Tab
                </a>
                <a
                  href={fileUrl}
                  download
                  className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </a>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform origin-top duration-150"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <iframe
                src={embedUrl}
                title={title}
                className="w-full h-full border-none bg-slate-100"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>In-Browser Document Reader</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Press <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] font-mono">Esc</kbd> to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Download, FileText, AlertCircle } from 'lucide-react';
import type { ImagingDocument } from '../../types';

interface ImagingViewerModalProps {
  doc: ImagingDocument;
  onClose: () => void;
}

export default function ImagingViewerModal({ doc, onClose }: ImagingViewerModalProps) {
  const [loadError, setLoadError] = useState(false);

  const documentUrl = doc.storagePath?.startsWith('http')
    ? doc.storagePath
    : doc.bucketUrl
      ? `${doc.bucketUrl.replace(/\/$/, '')}/${doc.storagePath}`
      : '';

  const handleOpenExternal = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {doc.originalFilename || doc.storagePath}
            </h3>
            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Detail Line: <span className="font-mono text-gray-700 dark:text-gray-300">{doc.detailLineId}</span></span>
              {doc.billNumber && (
                <span>Bill: <span className="font-mono text-gray-700 dark:text-gray-300">{doc.billNumber}</span></span>
              )}
              {doc.documentTypeName && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                  {doc.documentTypeName}
                </span>
              )}
              {doc.bucketName && (
                <span>Bucket: {doc.bucketName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {documentUrl && (
              <>
                <a
                  href={documentUrl}
                  download={doc.originalFilename || 'document.pdf'}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={handleOpenExternal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden">
          {!documentUrl ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <AlertCircle className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No URL available</p>
              <p className="text-xs mt-1">This document's bucket does not have a URL configured.</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">Unable to display document</p>
              <p className="text-xs mt-1 mb-4">The document could not be loaded in the viewer.</p>
              <button
                onClick={handleOpenExternal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open in New Tab</span>
              </button>
            </div>
          ) : (
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              title={doc.originalFilename || 'Document Viewer'}
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </div>
    </div>,
    globalThis.document.body
  );
}

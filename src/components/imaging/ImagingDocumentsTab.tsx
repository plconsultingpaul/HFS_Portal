import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Loader2, FileText, Trash2, Eye, X, RefreshCw, Upload } from 'lucide-react';
import type { ImagingBucket, ImagingDocumentType, ImagingDocument } from '../../types';
import { fetchBuckets, fetchDocumentTypes, fetchDocuments, deleteDocument } from '../../services/imagingService';
import ImagingViewerModal from './ImagingViewerModal';
import ImagingUploadModal from './ImagingUploadModal';

interface ImagingDocumentsTabProps {
  isAdmin: boolean;
}

export default function ImagingDocumentsTab({ isAdmin }: ImagingDocumentsTabProps) {
  const [buckets, setBuckets] = useState<ImagingBucket[]>([]);
  const [docTypes, setDocTypes] = useState<ImagingDocumentType[]>([]);
  const [documents, setDocuments] = useState<ImagingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterBucket, setFilterBucket] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [viewingDoc, setViewingDoc] = useState<ImagingDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadFilters = useCallback(async () => {
    try {
      const [b, d] = await Promise.all([fetchBuckets(), fetchDocumentTypes()]);
      setBuckets(b);
      setDocTypes(d);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments({
        bucketId: filterBucket || undefined,
        documentTypeId: filterDocType || undefined,
        search: debouncedSearch || undefined,
      });
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterBucket, filterDocType, debouncedSearch]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center space-x-2 flex-1">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterBucket}
            onChange={(e) => { setFilterBucket(e.target.value); setLoading(true); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Buckets</option>
            {buckets.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filterDocType}
            onChange={(e) => { setFilterDocType(e.target.value); setLoading(true); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Document Types</option>
            {docTypes.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Detail Line ID or Bill Number..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No documents found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || filterBucket || filterDocType
              ? 'Try adjusting your filters or search query.'
              : 'Documents will appear here once uploaded through workflows.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detail Line ID</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Number</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Document Type</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bucket</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filename</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs text-gray-900 dark:text-gray-100">{doc.detailLineId}</td>
                  <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">{doc.billNumber || '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                      {doc.documentTypeName || '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{doc.bucketName || '-'}</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{doc.originalFilename || doc.storagePath}</td>
                  <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{formatFileSize(doc.fileSize)}</td>
                  <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(doc.createdAt)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="View document"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        deleteConfirmId === doc.id ? (
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleDelete(doc.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
            Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {viewingDoc && (
        <ImagingViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {showUploadModal && (
        <ImagingUploadModal
          buckets={buckets}
          docTypes={docTypes}
          onClose={() => setShowUploadModal(false)}
          onUploaded={(doc) => {
            setDocuments(prev => [doc, ...prev]);
          }}
        />
      )}
    </div>
  );
}

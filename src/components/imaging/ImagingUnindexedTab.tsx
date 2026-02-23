import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Loader2, FileText, Eye, X, RefreshCw, CheckCircle, XCircle, Tag, AlertCircle, Mail, HardDrive } from 'lucide-react';
import type { ImagingBucket, ImagingDocumentType, ImagingUnindexedItem } from '../../types';
import { fetchBuckets, fetchDocumentTypes, fetchUnindexedQueue, indexUnindexedItem, discardUnindexedItem } from '../../services/imagingService';
import ImagingViewerModal from './ImagingViewerModal';

interface ImagingUnindexedTabProps {
  isAdmin: boolean;
}

export default function ImagingUnindexedTab({ isAdmin }: ImagingUnindexedTabProps) {
  const [buckets, setBuckets] = useState<ImagingBucket[]>([]);
  const [docTypes, setDocTypes] = useState<ImagingDocumentType[]>([]);
  const [items, setItems] = useState<ImagingUnindexedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterBucket, setFilterBucket] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');

  const [viewingItem, setViewingItem] = useState<ImagingUnindexedItem | null>(null);
  const [indexingItemId, setIndexingItemId] = useState<string | null>(null);
  const [indexDetailLineId, setIndexDetailLineId] = useState('');
  const [indexDocTypeId, setIndexDocTypeId] = useState('');
  const [indexBillNumber, setIndexBillNumber] = useState('');
  const [submittingIndex, setSubmittingIndex] = useState(false);
  const [discardConfirmId, setDiscardConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadFilters = useCallback(async () => {
    try {
      const [b, d] = await Promise.all([fetchBuckets(), fetchDocumentTypes()]);
      setBuckets(b);
      setDocTypes(d);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await fetchUnindexedQueue({
        bucketId: filterBucket || undefined,
        status: filterStatus || undefined,
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to load unindexed queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterBucket, filterStatus]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleStartIndex = (item: ImagingUnindexedItem) => {
    setIndexingItemId(item.id);
    setIndexDetailLineId('');
    setIndexDocTypeId('');
    setIndexBillNumber('');
    setError('');

    if (item.detectedBarcodes.length > 0) {
      const firstBarcode = item.detectedBarcodes[0];
      const dashIdx = firstBarcode.indexOf('-');
      if (dashIdx > 0) {
        const possibleType = firstBarcode.substring(0, dashIdx);
        const possibleId = firstBarcode.substring(dashIdx + 1);
        const matchedType = docTypes.find(dt => dt.name.toLowerCase() === possibleType.toLowerCase());
        if (matchedType) {
          setIndexDocTypeId(matchedType.id);
          setIndexDetailLineId(possibleId);
        }
      }
    }
  };

  const handleSubmitIndex = async (item: ImagingUnindexedItem) => {
    if (!indexDetailLineId.trim() || !indexDocTypeId) {
      setError('Detail Line ID and Document Type are required');
      return;
    }
    setSubmittingIndex(true);
    setError('');
    try {
      await indexUnindexedItem(item.id, {
        detailLineId: indexDetailLineId.trim(),
        documentTypeId: indexDocTypeId,
        billNumber: indexBillNumber.trim() || undefined,
        bucketId: item.bucketId,
        storagePath: item.storagePath,
        originalFilename: item.originalFilename,
        fileSize: item.fileSize,
      });
      setItems(prev => prev.filter(i => i.id !== item.id));
      setIndexingItemId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to index document');
    } finally {
      setSubmittingIndex(false);
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      await discardUnindexedItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      setDiscardConfirmId(null);
    } catch (err) {
      console.error('Failed to discard item:', err);
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
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setLoading(true); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="indexed">Indexed</option>
            <option value="discarded">Discarded</option>
            <option value="">All</option>
          </select>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 text-green-300 dark:text-green-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {filterStatus === 'pending' ? 'No unindexed documents' : 'No documents found'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filterStatus === 'pending'
              ? 'All documents from SFTP/Email polling have been indexed or the queue is empty.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {item.originalFilename || item.storagePath}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        item.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : item.status === 'indexed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        item.sourceType === 'email'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.sourceType === 'email' ? <Mail className="h-2.5 w-2.5" /> : <HardDrive className="h-2.5 w-2.5" />}
                        <span>{item.sourceType === 'email' ? 'Email' : 'SFTP'}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      {item.bucketName && <span>Bucket: {item.bucketName}</span>}
                    </div>
                    {item.detectedBarcodes.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 mt-2">
                        <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        {item.detectedBarcodes.map((bc, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {bc}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.detectedBarcodes.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">No barcodes detected</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-3">
                    {item.bucketUrl && (
                      <button
                        onClick={() => setViewingItem(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStartIndex(item)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          Index
                        </button>
                        {discardConfirmId === item.id ? (
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleDiscard(item.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                            <button onClick={() => setDiscardConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDiscardConfirmId(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Discard"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {indexingItemId === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Manual Index</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Detail Line ID *</label>
                        <input
                          type="text"
                          value={indexDetailLineId}
                          onChange={(e) => setIndexDetailLineId(e.target.value)}
                          placeholder="e.g. 12345"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Document Type *</label>
                        <select
                          value={indexDocTypeId}
                          onChange={(e) => setIndexDocTypeId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select type...</option>
                          {docTypes.filter(d => d.isActive).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bill Number (optional)</label>
                        <input
                          type="text"
                          value={indexBillNumber}
                          onChange={(e) => setIndexBillNumber(e.target.value)}
                          placeholder="e.g. BN-001"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={() => handleSubmitIndex(item)}
                        disabled={!indexDetailLineId.trim() || !indexDocTypeId || submittingIndex}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {submittingIndex ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        <span>Confirm Index</span>
                      </button>
                      <button
                        onClick={() => setIndexingItemId(null)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
            Showing {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {viewingItem && (
        <ImagingViewerModal
          doc={{
            id: viewingItem.id,
            bucketId: viewingItem.bucketId,
            documentTypeId: viewingItem.documentTypeId || '',
            detailLineId: viewingItem.detailLineId || 'Unindexed',
            billNumber: viewingItem.billNumber || '',
            storagePath: viewingItem.storagePath,
            originalFilename: viewingItem.originalFilename,
            fileSize: viewingItem.fileSize,
            createdAt: viewingItem.createdAt,
            updatedAt: viewingItem.updatedAt,
            bucketName: viewingItem.bucketName,
            bucketUrl: viewingItem.bucketUrl,
          }}
          onClose={() => setViewingItem(null)}
        />
      )}
    </div>
  );
}

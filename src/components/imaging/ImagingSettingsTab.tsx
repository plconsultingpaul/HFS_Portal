import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, Database, FileType, ToggleLeft, ToggleRight, Check, X, AlertCircle, ScanBarcode } from 'lucide-react';
import type { ImagingBucket, ImagingDocumentType, ImagingBarcodePattern } from '../../types';
import {
  fetchBuckets,
  createBucket,
  updateBucket,
  deleteBucket,
  fetchDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  fetchBarcodePatterns,
  createBarcodePattern,
  updateBarcodePattern,
  deleteBarcodePattern,
} from '../../services/imagingService';
import ImagingEmailMonitoringSection from './ImagingEmailMonitoringSection';

interface ImagingSettingsTabProps {
  isAdmin: boolean;
}

export default function ImagingSettingsTab({ isAdmin }: ImagingSettingsTabProps) {
  const [buckets, setBuckets] = useState<ImagingBucket[]>([]);
  const [docTypes, setDocTypes] = useState<ImagingDocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketUrl, setNewBucketUrl] = useState('');
  const [newBucketDesc, setNewBucketDesc] = useState('');
  const [creatingBucket, setCreatingBucket] = useState(false);

  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [editBucketUrl, setEditBucketUrl] = useState('');
  const [editBucketDesc, setEditBucketDesc] = useState('');
  const [deleteBucketConfirmId, setDeleteBucketConfirmId] = useState<string | null>(null);

  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [newDocTypeDesc, setNewDocTypeDesc] = useState('');
  const [creatingDocType, setCreatingDocType] = useState(false);

  const [editingDocTypeId, setEditingDocTypeId] = useState<string | null>(null);
  const [editDocTypeName, setEditDocTypeName] = useState('');
  const [editDocTypeDesc, setEditDocTypeDesc] = useState('');
  const [deleteDocTypeConfirmId, setDeleteDocTypeConfirmId] = useState<string | null>(null);

  const [patterns, setPatterns] = useState<ImagingBarcodePattern[]>([]);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternTemplate, setNewPatternTemplate] = useState('{documentType}-{detailLineId}');
  const [newPatternSeparator, setNewPatternSeparator] = useState('-');
  const [newPatternFixedType, setNewPatternFixedType] = useState('');
  const [newPatternBucketId, setNewPatternBucketId] = useState('');
  const [newPatternPriority, setNewPatternPriority] = useState(0);
  const [creatingPattern, setCreatingPattern] = useState(false);
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [editPatternName, setEditPatternName] = useState('');
  const [editPatternTemplate, setEditPatternTemplate] = useState('');
  const [editPatternSeparator, setEditPatternSeparator] = useState('');
  const [editPatternFixedType, setEditPatternFixedType] = useState('');
  const [editPatternBucketId, setEditPatternBucketId] = useState('');
  const [editPatternPriority, setEditPatternPriority] = useState(0);
  const [deletePatternConfirmId, setDeletePatternConfirmId] = useState<string | null>(null);

  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [b, d, p] = await Promise.all([fetchBuckets(), fetchDocumentTypes(), fetchBarcodePatterns()]);
      setBuckets(b);
      setDocTypes(d);
      setPatterns(p);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateBucket = async () => {
    if (!newBucketName.trim() || !newBucketUrl.trim()) return;
    setCreatingBucket(true);
    setError('');
    try {
      const bucket = await createBucket(newBucketName.trim(), newBucketUrl.trim(), newBucketDesc.trim());
      setBuckets(prev => [...prev, bucket].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBucketName('');
      setNewBucketUrl('');
      setNewBucketDesc('');
    } catch (err: any) {
      setError(err.message || 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleSaveBucket = async (id: string) => {
    if (!editBucketName.trim() || !editBucketUrl.trim()) return;
    setError('');
    try {
      await updateBucket(id, { name: editBucketName.trim(), url: editBucketUrl.trim(), description: editBucketDesc.trim() });
      setBuckets(prev => prev.map(b => b.id === id ? { ...b, name: editBucketName.trim(), url: editBucketUrl.trim(), description: editBucketDesc.trim() } : b));
      setEditingBucketId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update bucket');
    }
  };

  const handleToggleBucket = async (id: string, currentActive: boolean) => {
    try {
      await updateBucket(id, { isActive: !currentActive });
      setBuckets(prev => prev.map(b => b.id === id ? { ...b, isActive: !currentActive } : b));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle bucket');
    }
  };

  const handleDeleteBucket = async (id: string) => {
    setError('');
    try {
      await deleteBucket(id);
      setBuckets(prev => prev.filter(b => b.id !== id));
      setDeleteBucketConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete bucket. It may have documents linked to it.');
    }
  };

  const handleCreateDocType = async () => {
    if (!newDocTypeName.trim()) return;
    setCreatingDocType(true);
    setError('');
    try {
      const dt = await createDocumentType(newDocTypeName.trim(), newDocTypeDesc.trim());
      setDocTypes(prev => [...prev, dt].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDocTypeName('');
      setNewDocTypeDesc('');
    } catch (err: any) {
      setError(err.message || 'Failed to create document type');
    } finally {
      setCreatingDocType(false);
    }
  };

  const handleSaveDocType = async (id: string) => {
    if (!editDocTypeName.trim()) return;
    setError('');
    try {
      await updateDocumentType(id, { name: editDocTypeName.trim(), description: editDocTypeDesc.trim() });
      setDocTypes(prev => prev.map(d => d.id === id ? { ...d, name: editDocTypeName.trim(), description: editDocTypeDesc.trim() } : d));
      setEditingDocTypeId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update document type');
    }
  };

  const handleToggleDocType = async (id: string, currentActive: boolean) => {
    try {
      await updateDocumentType(id, { isActive: !currentActive });
      setDocTypes(prev => prev.map(d => d.id === id ? { ...d, isActive: !currentActive } : d));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle document type');
    }
  };

  const handleDeleteDocType = async (id: string) => {
    setError('');
    try {
      await deleteDocumentType(id);
      setDocTypes(prev => prev.filter(d => d.id !== id));
      setDeleteDocTypeConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document type. It may have documents linked to it.');
    }
  };

  const handleCreatePattern = async () => {
    if (!newPatternName.trim() || !newPatternBucketId) return;
    setCreatingPattern(true);
    setError('');
    try {
      const p = await createBarcodePattern({
        name: newPatternName.trim(),
        patternTemplate: newPatternTemplate.trim(),
        separator: newPatternSeparator || '-',
        fixedDocumentType: newPatternFixedType.trim() || null,
        bucketId: newPatternBucketId,
        priority: newPatternPriority,
      });
      setPatterns(prev => [...prev, p].sort((a, b) => a.priority - b.priority));
      setNewPatternName('');
      setNewPatternTemplate('{documentType}-{detailLineId}');
      setNewPatternSeparator('-');
      setNewPatternFixedType('');
      setNewPatternBucketId('');
      setNewPatternPriority(0);
    } catch (err: any) {
      setError(err.message || 'Failed to create barcode pattern');
    } finally {
      setCreatingPattern(false);
    }
  };

  const handleSavePattern = async (id: string) => {
    if (!editPatternName.trim() || !editPatternBucketId) return;
    setError('');
    try {
      await updateBarcodePattern(id, {
        name: editPatternName.trim(),
        patternTemplate: editPatternTemplate.trim(),
        separator: editPatternSeparator || '-',
        fixedDocumentType: editPatternFixedType.trim() || null,
        bucketId: editPatternBucketId,
        priority: editPatternPriority,
      });
      setPatterns(prev => prev.map(p => p.id === id ? {
        ...p,
        name: editPatternName.trim(),
        patternTemplate: editPatternTemplate.trim(),
        separator: editPatternSeparator || '-',
        fixedDocumentType: editPatternFixedType.trim() || null,
        bucketId: editPatternBucketId,
        priority: editPatternPriority,
        bucketName: buckets.find(b => b.id === editPatternBucketId)?.name,
      } : p));
      setEditingPatternId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update barcode pattern');
    }
  };

  const handleTogglePattern = async (id: string, currentActive: boolean) => {
    try {
      await updateBarcodePattern(id, { isActive: !currentActive });
      setPatterns(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentActive } : p));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle barcode pattern');
    }
  };

  const handleDeletePattern = async (id: string) => {
    setError('');
    try {
      await deleteBarcodePattern(id);
      setPatterns(prev => prev.filter(p => p.id !== id));
      setDeletePatternConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete barcode pattern');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Storage Buckets</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {buckets.length}
          </span>
        </div>

        {isAdmin && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="Bucket name..."
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newBucketUrl}
                onChange={(e) => setNewBucketUrl(e.target.value)}
                placeholder="Base URL (e.g. https://storage.example.com/images)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newBucketDesc}
                onChange={(e) => setNewBucketDesc(e.target.value)}
                placeholder="Description (optional)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreateBucket}
              disabled={!newBucketName.trim() || !newBucketUrl.trim() || creatingBucket}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creatingBucket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Add Bucket</span>
            </button>
          </div>
        )}

        {buckets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No storage buckets configured yet.
          </div>
        ) : (
          <div className="space-y-2">
            {buckets.map(bucket => (
              <div
                key={bucket.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 group"
              >
                {editingBucketId === bucket.id ? (
                  <div className="flex-1 space-y-2 mr-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editBucketName}
                        onChange={(e) => setEditBucketName(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editBucketUrl}
                        onChange={(e) => setEditBucketUrl(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={editBucketDesc}
                        onChange={(e) => setEditBucketDesc(e.target.value)}
                        placeholder="Description"
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleSaveBucket(bucket.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingBucketId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{bucket.name}</span>
                      {!bucket.isActive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{bucket.url}</p>
                    {bucket.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{bucket.description}</p>}
                  </div>
                )}

                {editingBucketId !== bucket.id && isAdmin && (
                  <div className="flex items-center space-x-1 ml-3">
                    <button
                      onClick={() => handleToggleBucket(bucket.id, bucket.isActive)}
                      className="p-1.5 rounded transition-colors"
                      title={bucket.isActive ? 'Active' : 'Inactive'}
                    >
                      {bucket.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingBucketId(bucket.id);
                        setEditBucketName(bucket.name);
                        setEditBucketUrl(bucket.url);
                        setEditBucketDesc(bucket.description);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteBucketConfirmId === bucket.id ? (
                      <div className="flex items-center space-x-1">
                        <button onClick={() => handleDeleteBucket(bucket.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                        <button onClick={() => setDeleteBucketConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteBucketConfirmId(bucket.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <section>
        <div className="flex items-center space-x-2 mb-4">
          <FileType className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Types</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {docTypes.length}
          </span>
        </div>

        {isAdmin && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDocType()}
                placeholder="Document type name (e.g. BOL, POD, Invoice)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newDocTypeDesc}
                onChange={(e) => setNewDocTypeDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDocType()}
                placeholder="Description (optional)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreateDocType}
              disabled={!newDocTypeName.trim() || creatingDocType}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creatingDocType ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Add Document Type</span>
            </button>
          </div>
        )}

        {docTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No document types configured yet.
          </div>
        ) : (
          <div className="space-y-2">
            {docTypes.map(dt => (
              <div
                key={dt.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 group"
              >
                {editingDocTypeId === dt.id ? (
                  <div className="flex-1 space-y-2 mr-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editDocTypeName}
                        onChange={(e) => setEditDocTypeName(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editDocTypeDesc}
                        onChange={(e) => setEditDocTypeDesc(e.target.value)}
                        placeholder="Description"
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleSaveDocType(dt.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingDocTypeId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{dt.name}</span>
                      {!dt.isActive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">Inactive</span>
                      )}
                    </div>
                    {dt.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dt.description}</p>}
                  </div>
                )}

                {editingDocTypeId !== dt.id && isAdmin && (
                  <div className="flex items-center space-x-1 ml-3">
                    <button
                      onClick={() => handleToggleDocType(dt.id, dt.isActive)}
                      className="p-1.5 rounded transition-colors"
                      title={dt.isActive ? 'Active' : 'Inactive'}
                    >
                      {dt.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDocTypeId(dt.id);
                        setEditDocTypeName(dt.name);
                        setEditDocTypeDesc(dt.description);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteDocTypeConfirmId === dt.id ? (
                      <div className="flex items-center space-x-1">
                        <button onClick={() => handleDeleteDocType(dt.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                        <button onClick={() => setDeleteDocTypeConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteDocTypeConfirmId(dt.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <section>
        <div className="flex items-center space-x-2 mb-4">
          <ScanBarcode className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Barcode Patterns</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {patterns.length}
          </span>
        </div>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <p><strong>Pattern Templates:</strong> Define how barcodes are parsed into document type and detail line ID.</p>
          <p>Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{documentType}'}-{'{detailLineId}'}</code> for dynamic parsing (e.g. "BOL-12345" or "Invoice-67890").</p>
          <p>Or set a <strong>Fixed Document Type</strong> for patterns like "BOL-12345" where the prefix is always the same type.</p>
        </div>

        {isAdmin && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={newPatternName}
                onChange={(e) => setNewPatternName(e.target.value)}
                placeholder="Pattern name (e.g. Standard BOL Barcode)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newPatternTemplate}
                onChange={(e) => setNewPatternTemplate(e.target.value)}
                placeholder="{documentType}-{detailLineId}"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newPatternSeparator}
                onChange={(e) => setNewPatternSeparator(e.target.value)}
                placeholder="Separator (-)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newPatternFixedType}
                onChange={(e) => setNewPatternFixedType(e.target.value)}
                placeholder="Fixed doc type (optional)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={newPatternBucketId}
                onChange={(e) => setNewPatternBucketId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select bucket...</option>
                {buckets.filter(b => b.isActive).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={newPatternPriority}
                onChange={(e) => setNewPatternPriority(parseInt(e.target.value) || 0)}
                placeholder="Priority (0)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreatePattern}
              disabled={!newPatternName.trim() || !newPatternBucketId || creatingPattern}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creatingPattern ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Add Pattern</span>
            </button>
          </div>
        )}

        {patterns.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No barcode patterns configured yet.
          </div>
        ) : (
          <div className="space-y-2">
            {patterns.map(pattern => (
              <div
                key={pattern.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 group"
              >
                {editingPatternId === pattern.id ? (
                  <div className="flex-1 space-y-2 mr-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input type="text" value={editPatternName} onChange={(e) => setEditPatternName(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" autoFocus placeholder="Name" />
                      <input type="text" value={editPatternTemplate} onChange={(e) => setEditPatternTemplate(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono" placeholder="Template" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input type="text" value={editPatternSeparator} onChange={(e) => setEditPatternSeparator(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" placeholder="Separator" />
                      <input type="text" value={editPatternFixedType} onChange={(e) => setEditPatternFixedType(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" placeholder="Fixed type (optional)" />
                      <select value={editPatternBucketId} onChange={(e) => setEditPatternBucketId(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                        <option value="">Select bucket...</option>
                        {buckets.filter(b => b.isActive).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <input type="number" value={editPatternPriority} onChange={(e) => setEditPatternPriority(parseInt(e.target.value) || 0)}
                        className="px-2 py-1.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" placeholder="Priority" />
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleSavePattern(pattern.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingPatternId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{pattern.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        P{pattern.priority}
                      </span>
                      {!pattern.isActive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono">{pattern.patternTemplate}</span>
                      <span>sep: "{pattern.separator}"</span>
                      {pattern.fixedDocumentType && <span>fixed: {pattern.fixedDocumentType}</span>}
                      {pattern.bucketName && <span>bucket: {pattern.bucketName}</span>}
                    </div>
                  </div>
                )}

                {editingPatternId !== pattern.id && isAdmin && (
                  <div className="flex items-center space-x-1 ml-3">
                    <button onClick={() => handleTogglePattern(pattern.id, pattern.isActive)} className="p-1.5 rounded transition-colors"
                      title={pattern.isActive ? 'Active' : 'Inactive'}>
                      {pattern.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPatternId(pattern.id);
                        setEditPatternName(pattern.name);
                        setEditPatternTemplate(pattern.patternTemplate);
                        setEditPatternSeparator(pattern.separator);
                        setEditPatternFixedType(pattern.fixedDocumentType || '');
                        setEditPatternBucketId(pattern.bucketId);
                        setEditPatternPriority(pattern.priority);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deletePatternConfirmId === pattern.id ? (
                      <div className="flex items-center space-x-1">
                        <button onClick={() => handleDeletePattern(pattern.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                        <button onClick={() => setDeletePatternConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletePatternConfirmId(pattern.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <ImagingEmailMonitoringSection isAdmin={isAdmin} />

      {!isAdmin && (
        <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Admin access required to manage imaging settings.</span>
        </div>
      )}
    </div>
  );
}

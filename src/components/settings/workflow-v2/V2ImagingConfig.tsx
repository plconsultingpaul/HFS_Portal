import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchBuckets, fetchDocumentTypes } from '../../../services/imagingService';
import type { ImagingBucket, ImagingDocumentType } from '../../../types';

interface V2ImagingConfigProps {
  config: any;
  updateConfig: (key: string, value: any) => void;
}

export default function V2ImagingConfig({ config, updateConfig }: V2ImagingConfigProps) {
  const [buckets, setBuckets] = useState<ImagingBucket[]>([]);
  const [docTypes, setDocTypes] = useState<ImagingDocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [b, d] = await Promise.all([fetchBuckets(), fetchDocumentTypes()]);
        setBuckets(b.filter(x => x.isActive));
        setDocTypes(d.filter(x => x.isActive));
      } catch (err) {
        console.error('Failed to load imaging config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mode</label>
        <select
          value={config.imagingMode || 'put'}
          onChange={(e) => updateConfig('imagingMode', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="put">PUT - Upload to Imaging</option>
          <option value="get">GET - Retrieve from Imaging</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Storage Bucket</label>
        <select
          value={config.bucketId || ''}
          onChange={(e) => updateConfig('bucketId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select a bucket...</option>
          {buckets.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Document Type</label>
        <select
          value={config.documentTypeId || ''}
          onChange={(e) => updateConfig('documentTypeId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select a document type...</option>
          {docTypes.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Detail Line ID
          <span className="ml-1 text-gray-400 font-normal">(supports {'{{variable}}'})</span>
        </label>
        <input
          type="text"
          value={config.detailLineId || ''}
          onChange={(e) => updateConfig('detailLineId', e.target.value)}
          placeholder="e.g. {{detailLineId}} or {{orders.0.detailLineId}}"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      {(config.imagingMode || 'put') === 'put' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Bill Number
            <span className="ml-1 text-gray-400 font-normal">(supports {'{{variable}}'})</span>
          </label>
          <input
            type="text"
            value={config.billNumber || ''}
            onChange={(e) => updateConfig('billNumber', e.target.value)}
            placeholder="e.g. {{billNumber}} or {{orders.0.billNumber}}"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-xs text-gray-500 dark:text-gray-400">
        {(config.imagingMode || 'put') === 'put' ? (
          <p>PUT mode: uploads the current PDF to the selected bucket with the given detail line ID, bill number, and document type.</p>
        ) : (
          <p>GET mode: retrieves a document from the selected bucket using the detail line ID and document type. The document URL will be stored in the workflow context.</p>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Loader2, Save, Play, TestTube, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, AlertCircle, X, CheckCircle } from 'lucide-react';
import type { ImagingEmailMonitoringConfig, ImagingBucket, PostProcessAction } from '../../types';
import { fetchImagingEmailConfig, updateImagingEmailConfig, fetchBuckets } from '../../services/imagingService';
import { supabase } from '../../lib/supabase';

interface ImagingEmailMonitoringSectionProps {
  isAdmin: boolean;
}

const POST_PROCESS_OPTIONS: { value: PostProcessAction; label: string }[] = [
  { value: 'mark_read', label: 'Mark as Read' },
  { value: 'move', label: 'Move to Folder' },
  { value: 'archive', label: 'Archive' },
  { value: 'delete', label: 'Delete' },
  { value: 'none', label: 'Do Nothing' },
];

export default function ImagingEmailMonitoringSection({ isAdmin }: ImagingEmailMonitoringSectionProps) {
  const [config, setConfig] = useState<ImagingEmailMonitoringConfig | null>(null);
  const [buckets, setBuckets] = useState<ImagingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [cfg, bkts] = await Promise.all([fetchImagingEmailConfig(), fetchBuckets()]);
      setConfig(cfg);
      setBuckets(bkts);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging email config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateImagingEmailConfig(config);
      setSuccess('Imaging email monitoring configuration saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      if (config.provider === 'office365') {
        const { data, error: fnErr } = await supabase.functions.invoke('test-office365', {
          body: {
            mode: 'monitor',
            tenantId: config.tenantId,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            monitoredEmail: config.monitoredEmail,
          },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setSuccess('Office 365 connection test successful.');
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke('test-email-connection', {
          body: {
            provider: 'gmail',
            gmailClientId: config.gmailClientId,
            gmailClientSecret: config.gmailClientSecret,
            gmailRefreshToken: config.gmailRefreshToken,
          },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setSuccess('Gmail connection test successful.');
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setError('');
    setSuccess('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('imaging-email-monitor', {
        body: {},
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const msg = data?.emailsFound !== undefined
        ? `Completed: ${data.emailsFound} email(s) found, ${data.pdfsProcessed || 0} PDF(s) processed, ${data.indexed || 0} indexed, ${data.unindexed || 0} unindexed.`
        : 'Imaging email monitor completed successfully.';
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to run imaging email monitor');
    } finally {
      setRunning(false);
    }
  };

  const update = (partial: Partial<ImagingEmailMonitoringConfig>) => {
    setConfig(prev => prev ? { ...prev, ...partial } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config) return null;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-2 mb-4 w-full text-left group"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Imaging Email Monitoring</h3>
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${config.isEnabled ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
          {config.isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-6 pl-6">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Imaging Email Monitoring</span>
            <button onClick={() => update({ isEnabled: !config.isEnabled })} disabled={!isAdmin}>
              {config.isEnabled ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
            </button>
          </div>

          <div>
            <label className={labelCls}>Email Provider</label>
            <div className="flex space-x-2">
              {(['office365', 'gmail'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => update({ provider: p })}
                  disabled={!isAdmin}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    config.provider === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {p === 'office365' ? 'Office 365' : 'Gmail'}
                </button>
              ))}
            </div>
          </div>

          {config.provider === 'office365' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Tenant ID</label>
                  <input type="text" className={inputCls} value={config.tenantId} onChange={(e) => update({ tenantId: e.target.value })} disabled={!isAdmin} />
                </div>
                <div>
                  <label className={labelCls}>Client ID</label>
                  <input type="text" className={inputCls} value={config.clientId} onChange={(e) => update({ clientId: e.target.value })} disabled={!isAdmin} />
                </div>
                <div>
                  <label className={labelCls}>Client Secret</label>
                  <input type="password" className={inputCls} value={config.clientSecret} onChange={(e) => update({ clientSecret: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Monitored Email Address</label>
                <input type="email" className={inputCls} value={config.monitoredEmail} onChange={(e) => update({ monitoredEmail: e.target.value })} placeholder="imaging@example.com" disabled={!isAdmin} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Gmail Client ID</label>
                  <input type="text" className={inputCls} value={config.gmailClientId} onChange={(e) => update({ gmailClientId: e.target.value })} disabled={!isAdmin} />
                </div>
                <div>
                  <label className={labelCls}>Gmail Client Secret</label>
                  <input type="password" className={inputCls} value={config.gmailClientSecret} onChange={(e) => update({ gmailClientSecret: e.target.value })} disabled={!isAdmin} />
                </div>
                <div>
                  <label className={labelCls}>Gmail Refresh Token</label>
                  <input type="password" className={inputCls} value={config.gmailRefreshToken} onChange={(e) => update({ gmailRefreshToken: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Monitored Label</label>
                <input type="text" className={inputCls} value={config.gmailMonitoredLabel} onChange={(e) => update({ gmailMonitoredLabel: e.target.value })} placeholder="INBOX" disabled={!isAdmin} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Target Imaging Bucket</label>
              <select
                className={inputCls}
                value={config.imagingBucketId || ''}
                onChange={(e) => update({ imagingBucketId: e.target.value || null })}
                disabled={!isAdmin}
              >
                <option value="">Select bucket...</option>
                {buckets.filter(b => b.isActive).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Polling Interval (minutes)</label>
              <input
                type="number"
                className={inputCls}
                value={config.pollingInterval}
                onChange={(e) => update({ pollingInterval: parseInt(e.target.value) || 5 })}
                min={1}
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Check All Messages (ignore last check timestamp)</span>
            <button onClick={() => update({ checkAllMessages: !config.checkAllMessages })} disabled={!isAdmin}>
              {config.checkAllMessages ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">After Processing Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={labelCls}>On Success</label>
                <select className={inputCls} value={config.postProcessAction} onChange={(e) => update({ postProcessAction: e.target.value as PostProcessAction })} disabled={!isAdmin}>
                  {POST_PROCESS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {config.postProcessAction === 'move' && (
                  <input type="text" className={inputCls} value={config.processedFolderPath} onChange={(e) => update({ processedFolderPath: e.target.value })} placeholder="Folder name" disabled={!isAdmin} />
                )}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>On Failure</label>
                <select className={inputCls} value={config.postProcessActionOnFailure} onChange={(e) => update({ postProcessActionOnFailure: e.target.value as PostProcessAction })} disabled={!isAdmin}>
                  {POST_PROCESS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {config.postProcessActionOnFailure === 'move' && (
                  <input type="text" className={inputCls} value={config.failureFolderPath} onChange={(e) => update({ failureFolderPath: e.target.value })} placeholder="Folder name" disabled={!isAdmin} />
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save</span>
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                <span>Test Connection</span>
              </button>
              <button
                onClick={handleRunNow}
                disabled={running}
                className="flex items-center space-x-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>Run Now</span>
              </button>
            </div>
          )}

          {config.lastCheck && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last check: {new Date(config.lastCheck).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

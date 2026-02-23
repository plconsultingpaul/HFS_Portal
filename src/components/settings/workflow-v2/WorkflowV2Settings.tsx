import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Loader2, GitMerge, ToggleLeft, ToggleRight, Trash2, Edit2, AlertCircle, Filter, ClipboardList, FileText } from 'lucide-react';
import WorkflowV2FlowDesigner from './WorkflowV2FlowDesigner';
import {
  fetchWorkflowsV2,
  createWorkflowV2,
  updateWorkflowV2,
  deleteWorkflowV2,
} from '../../../services/workflowV2Service';
import type { WorkflowV2, WorkflowV2Type, User } from '../../../types';
import ConfigChangeLogsModal, { logConfigChange } from '../../common/ConfigChangeLogsModal';

interface WorkflowV2SettingsProps {
  isAdmin: boolean;
  currentUser?: User;
}

export default function WorkflowV2Settings({ isAdmin, currentUser }: WorkflowV2SettingsProps) {
  const [workflows, setWorkflows] = useState<WorkflowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WorkflowV2Type>('extraction');
  const [filterType, setFilterType] = useState<WorkflowV2Type | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<WorkflowV2Type>('extraction');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showChangeLogs, setShowChangeLogs] = useState(false);
  const [showWorkflowLogs, setShowWorkflowLogs] = useState<{ name: string } | null>(null);

  const loadWorkflows = useCallback(async () => {
    try {
      const data = await fetchWorkflowsV2();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to load V2 workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = useMemo(() => {
    if (filterType === 'all') return workflows;
    return workflows.filter(w => w.workflowType === filterType);
  }, [workflows, filterType]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const wf = await createWorkflowV2(newName.trim(), newType);
      setWorkflows(prev => [wf, ...prev]);
      if (currentUser) logConfigChange('workflow_v2', `Created: ${newName.trim()}`, currentUser.id, currentUser.username);
      setNewName('');
      setNewType('extraction');
      setSelectedId(wf.id);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const wf = workflows.find(w => w.id === id);
    const updates: Parameters<typeof updateWorkflowV2>[1] = {};
    if (editName.trim() !== wf?.name) updates.name = editName.trim();
    if (editType !== wf?.workflowType) updates.workflowType = editType;
    if (Object.keys(updates).length === 0) { setEditingId(null); return; }
    try {
      await updateWorkflowV2(id, updates);
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name: editName.trim(), workflowType: editType } : w));
      if (currentUser) logConfigChange('workflow_v2', `Updated: ${editName.trim()}`, currentUser.id, currentUser.username);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update workflow:', err);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateWorkflowV2(id, { isActive: !currentActive });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !currentActive } : w));
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflowV2(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (selectedId === id) setSelectedId(null);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const selectedWorkflow = workflows.find(w => w.id === selectedId);

  if (selectedWorkflow) {
    return createPortal(
      <WorkflowV2FlowDesigner
        workflowId={selectedWorkflow.id}
        workflowName={selectedWorkflow.name}
        onBack={() => { setSelectedId(null); loadWorkflows(); }}
      />,
      document.body
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitMerge className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workflow v2</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
            Graph-based
          </span>
        </div>
        <button
          onClick={() => setShowChangeLogs(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ClipboardList className="h-4 w-4" />
          <span>Logs</span>
        </button>
      </div>

      {isAdmin && (
        <div className="flex items-center space-x-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as WorkflowV2Type)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="extraction">Extract</option>
            <option value="transformation">Transform</option>
            <option value="imaging">Imaging</option>
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New workflow name..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Create</span>
          </button>
        </div>
      )}

      {!loading && workflows.length > 0 && (
        <div className="flex items-center space-x-1 border-b border-gray-200 dark:border-gray-700 pb-2">
          <Filter className="h-3.5 w-3.5 text-gray-400 mr-1" />
          {(['all', 'extraction', 'transformation', 'imaging'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterType === type
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type === 'all' ? 'All' : type === 'extraction' ? 'Extract' : type === 'transformation' ? 'Transform' : 'Imaging'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12">
          <GitMerge className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No workflows yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your first graph-based workflow to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkflows.map(wf => (
            <div
              key={wf.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
            >
              <div
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => setSelectedId(wf.id)}
              >
                {editingId === wf.id ? (
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as WorkflowV2Type)}
                      className="px-2 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="extraction">Extract</option>
                      <option value="transformation">Transform</option>
                      <option value="imaging">Imaging</option>
                    </select>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(wf.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleSaveEdit(wf.id)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{wf.name}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                      wf.workflowType === 'extraction'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : wf.workflowType === 'transformation'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}>
                      {wf.workflowType === 'extraction' ? 'Extract' : wf.workflowType === 'transformation' ? 'Transform' : 'Imaging'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1 ml-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowWorkflowLogs({ name: wf.name }); }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  title={`View logs for ${wf.name}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(wf.id, wf.isActive); }}
                  className="p-1.5 rounded transition-colors"
                  title={wf.isActive ? 'Active' : 'Inactive'}
                >
                  {wf.isActive ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(wf.id);
                        setEditName(wf.name);
                        setEditType(wf.workflowType);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === wf.id ? (
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(wf.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(wf.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Admin access required to create and manage workflows.</span>
        </div>
      )}

      {showChangeLogs && (
        <ConfigChangeLogsModal
          configType="workflow_v2"
          title="Workflow v2 Change Logs"
          onClose={() => setShowChangeLogs(false)}
        />
      )}

      {showWorkflowLogs && (
        <ConfigChangeLogsModal
          configType="workflow_v2"
          title={`Logs: ${showWorkflowLogs.name}`}
          itemFilter={showWorkflowLogs.name}
          onClose={() => setShowWorkflowLogs(null)}
        />
      )}
    </div>
  );
}

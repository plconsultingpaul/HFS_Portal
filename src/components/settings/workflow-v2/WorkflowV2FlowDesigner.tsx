import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft, Save, Plus, Globe, GitBranch, RefreshCw, Upload,
  Mail, FileText, Send, Loader2, Check, BrainCircuit, BookOpen,
} from 'lucide-react';
import { workflowV2NodeTypes } from './WorkflowV2FlowNodes';
import WorkflowV2StepConfigPanel from './WorkflowV2StepConfigPanel';
import {
  fetchWorkflowV2Nodes,
  fetchWorkflowV2Edges,
  saveWorkflowV2Nodes,
  saveWorkflowV2Edges,
  saveWorkflowV2SingleNode,
} from '../../../services/workflowV2Service';
import type { WorkflowV2Node, WorkflowV2Edge, WorkflowV2StepType } from '../../../types';
import { logConfigChange } from '../../common/ConfigChangeLogsModal';
import { useAuth } from '../../../hooks/useAuth';

interface WorkflowV2FlowDesignerProps {
  workflowId: string;
  workflowName: string;
  onBack: () => void;
  defaultZoom?: number;
}

const STEP_TYPE_OPTIONS: { type: WorkflowV2StepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'api_call', label: 'API Call', icon: <Globe className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60' },
  { type: 'api_endpoint', label: 'API Endpoint', icon: <Globe className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60' },
  { type: 'conditional_check', label: 'Condition', icon: <GitBranch className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60' },
  { type: 'data_transform', label: 'Transform', icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60' },
  { type: 'sftp_upload', label: 'SFTP Upload', icon: <Upload className="h-3.5 w-3.5" />, color: 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:hover:bg-teal-900/60' },
  { type: 'email_action', label: 'Email', icon: <Mail className="h-3.5 w-3.5" />, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60' },
  { type: 'rename_file', label: 'Rename File', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:hover:bg-slate-700/60' },
  { type: 'multipart_form_upload', label: 'Multipart Upload', icon: <Send className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60' },
  { type: 'ai_decision', label: 'AI Decision', icon: <BrainCircuit className="h-3.5 w-3.5" />, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60' },
  { type: 'read_email', label: 'Read Email', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60' },
];

function dbNodesToFlow(dbNodes: WorkflowV2Node[]): Node[] {
  return dbNodes.map(n => ({
    id: n.id,
    type: n.nodeType,
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      stepType: n.stepType || '',
      configJson: n.configJson,
      escapeSingleQuotesInBody: n.escapeSingleQuotesInBody,
      userResponseTemplate: n.userResponseTemplate,
    },
    ...(n.width ? { width: n.width } : {}),
    ...(n.height ? { height: n.height } : {}),
  }));
}

function dbEdgesToFlow(dbEdges: WorkflowV2Edge[]): Edge[] {
  return dbEdges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle === 'default' ? undefined : e.sourceHandle,
    targetHandle: e.targetHandle === 'default' ? undefined : e.targetHandle,
    label: e.label || undefined,
    type: 'smoothstep',
    animated: e.animated,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
    style: { strokeWidth: 2 },
  }));
}

function flowNodesToDb(flowNodes: Node[], workflowId: string): WorkflowV2Node[] {
  return flowNodes.map(n => ({
    id: n.id,
    workflowId,
    nodeType: (n.type as 'start' | 'workflow') || 'workflow',
    positionX: n.position.x,
    positionY: n.position.y,
    width: n.width || undefined,
    height: n.height || undefined,
    label: n.data.label || '',
    stepType: n.data.stepType || undefined,
    configJson: n.data.configJson || {},
    escapeSingleQuotesInBody: n.data.escapeSingleQuotesInBody || false,
    userResponseTemplate: n.data.userResponseTemplate || undefined,
  }));
}

function flowEdgesToDb(flowEdges: Edge[], workflowId: string): WorkflowV2Edge[] {
  return flowEdges.map(e => ({
    id: e.id,
    workflowId,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    sourceHandle: e.sourceHandle || 'default',
    targetHandle: e.targetHandle || 'default',
    label: typeof e.label === 'string' ? e.label : undefined,
    edgeType: 'default',
    animated: e.animated || false,
  }));
}

function WorkflowV2FlowDesignerInner({ workflowId, workflowName, onBack, defaultZoom = 75 }: WorkflowV2FlowDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const counterRef = useRef(0);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadFlow();
  }, [workflowId]);

  const loadFlow = async () => {
    setLoading(true);
    try {
      const [dbNodes, dbEdges] = await Promise.all([
        fetchWorkflowV2Nodes(workflowId),
        fetchWorkflowV2Edges(workflowId),
      ]);
      setNodes(dbNodesToFlow(dbNodes));
      setEdges(dbEdgesToFlow(dbEdges));
    } catch (err) {
      console.error('Failed to load workflow flow:', err);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    const edgeStyle = {
      type: 'smoothstep' as const,
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      style: { strokeWidth: 2 },
      label: params.sourceHandle === 'success' ? 'Yes' : params.sourceHandle === 'failure' ? 'No' : undefined,
    };
    setEdges((eds) => addEdge({ ...params, ...edgeStyle }, eds));
  }, [setEdges]);

  const addStepNode = useCallback((stepType: WorkflowV2StepType) => {
    counterRef.current += 1;
    const label = STEP_TYPE_OPTIONS.find(o => o.type === stepType)?.label || 'Step';
    const newNode: Node = {
      id: `temp-${Date.now()}-${counterRef.current}`,
      type: 'workflow',
      position: { x: 250, y: 150 + (nodes.length * 120) },
      data: {
        label: `${label} ${counterRef.current}`,
        stepType,
        configJson: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowAddMenu(false);
  }, [nodes.length, setNodes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dbNodes = flowNodesToDb(nodes, workflowId);
      const dbEdges = flowEdgesToDb(edges, workflowId);
      const idMap = await saveWorkflowV2Nodes(workflowId, dbNodes);
      const remappedEdges = dbEdges.map(e => ({
        ...e,
        sourceNodeId: idMap[e.sourceNodeId] || e.sourceNodeId,
        targetNodeId: idMap[e.targetNodeId] || e.targetNodeId,
      }));
      await saveWorkflowV2Edges(workflowId, remappedEdges);
      await loadFlow();
      if (currentUser) logConfigChange('workflow_v2', `Saved: ${workflowName}`, currentUser.id, currentUser.username);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'start') return;
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleUpdateNodeData = useCallback((nodeId: string, updates: Record<string, any>) => {
    setNodes((nds) =>
      nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
  }, [setNodes]);

  const handleSaveNode = useCallback(async (nodeId: string, updates: Record<string, any>) => {
    await saveWorkflowV2SingleNode(nodeId, {
      label: updates.label || '',
      stepType: updates.stepType || null,
      configJson: updates.configJson || {},
      escapeSingleQuotesInBody: updates.escapeSingleQuotesInBody || false,
      userResponseTemplate: updates.userResponseTemplate || null,
    });
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const nodesWithHandlers = nodes.map(n => {
    if (n.type === 'start') return n;
    return {
      ...n,
      data: {
        ...n.data,
        onEdit: () => setSelectedNodeId(n.id),
        onDelete: () => handleDeleteNode(n.id),
      },
    };
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{workflowName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {nodes.length} nodes, {edges.length} connections
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add Step</span>
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
                {STEP_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => addStepNode(opt.type)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className={`p-1.5 rounded ${opt.color}`}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-60`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={workflowV2NodeTypes}
          fitView
          fitViewOptions={{ maxZoom: defaultZoom / 100 }}
          defaultViewport={{ x: 0, y: 0, zoom: defaultZoom / 100 }}
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
            style: { strokeWidth: 2 },
          }}
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Controls className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-lg" />
          <MiniMap
            className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
            nodeColor={(node) => {
              if (node.type === 'start') return '#10b981';
              switch (node.data?.stepType) {
                case 'api_call':
                case 'api_endpoint':
                  return '#22c55e';
                case 'conditional_check':
                  return '#f97316';
                case 'data_transform':
                  return '#3b82f6';
                case 'sftp_upload':
                  return '#14b8a6';
                case 'email_action':
                  return '#f43f5e';
                case 'rename_file':
                  return '#64748b';
                case 'multipart_form_upload':
                  return '#f59e0b';
                case 'ai_decision':
                  return '#06b6d4';
                case 'read_email':
                  return '#0ea5e9';
                default:
                  return '#94a3b8';
              }
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {selectedNode && selectedNode.type === 'workflow' && (
          <WorkflowV2StepConfigPanel
            nodeId={selectedNode.id}
            label={selectedNode.data.label}
            stepType={selectedNode.data.stepType}
            configJson={selectedNode.data.configJson || {}}
            escapeSingleQuotesInBody={selectedNode.data.escapeSingleQuotesInBody || false}
            userResponseTemplate={selectedNode.data.userResponseTemplate || ''}
            onUpdate={(updates) => handleUpdateNodeData(selectedNode.id, updates)}
            onClose={() => setSelectedNodeId(null)}
            onDelete={() => handleDeleteNode(selectedNode.id)}
            allNodes={nodes}
            onSaveNode={handleSaveNode}
          />
        )}
      </div>
    </div>
  );
}

export default function WorkflowV2FlowDesigner(props: WorkflowV2FlowDesignerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowV2FlowDesignerInner {...props} />
    </ReactFlowProvider>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus, ChevronDown, ChevronRight, Braces, FileText, AlertCircle } from 'lucide-react';
import type { WorkflowV2StepType } from '../../../types';
import V2ApiEndpointConfig from './V2ApiEndpointConfig';
import V2AiDecisionConfig from './V2AiDecisionConfig';
import V2ImagingConfig from './V2ImagingConfig';
import V2ReadEmailConfig from './V2ReadEmailConfig';
import VariableDropdown from '../workflow/VariableDropdown';
import Select from '../../common/Select';
import { supabase } from '../../../lib/supabase';

interface WorkflowV2StepConfigPanelProps {
  nodeId: string;
  label: string;
  stepType: string;
  configJson: any;
  escapeSingleQuotesInBody: boolean;
  userResponseTemplate: string;
  onUpdate: (updates: Record<string, any>) => void;
  onClose: () => void;
  onDelete: () => void;
  allNodes?: any[];
  onSaveNode?: (nodeId: string, updates: Record<string, any>) => Promise<void>;
}

const STEP_TYPES: { value: WorkflowV2StepType; label: string }[] = [
  { value: 'api_call', label: 'API Call' },
  { value: 'api_endpoint', label: 'API Endpoint' },
  { value: 'conditional_check', label: 'Conditional Check' },
  { value: 'data_transform', label: 'Data Transform' },
  { value: 'sftp_upload', label: 'SFTP Upload' },
  { value: 'email_action', label: 'Email Action' },
  { value: 'rename_file', label: 'Rename File' },
  { value: 'multipart_form_upload', label: 'Multipart Form Upload' },
  { value: 'ai_decision', label: 'AI Decision' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'read_email', label: 'Read Email' },
];

export default function WorkflowV2StepConfigPanel({
  nodeId,
  label,
  stepType,
  configJson,
  escapeSingleQuotesInBody,
  userResponseTemplate,
  onUpdate,
  onClose,
  onDelete,
  allNodes = [],
  onSaveNode,
}: WorkflowV2StepConfigPanelProps) {
  const [localLabel, setLocalLabel] = useState(label);
  const [localStepType, setLocalStepType] = useState(stepType);
  const [config, setConfig] = useState<any>(configJson || {});
  const [localEscapeQuotes, setLocalEscapeQuotes] = useState(escapeSingleQuotesInBody);
  const [localResponseTemplate, setLocalResponseTemplate] = useState(userResponseTemplate);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ basic: true, config: true });
  const [showResponseVarDropdown, setShowResponseVarDropdown] = useState(false);
  const responseVarBtnRef = useRef<HTMLButtonElement>(null);
  const [secondaryApis, setSecondaryApis] = useState<any[]>([]);
  const [authConfigs, setAuthConfigs] = useState<any[]>([]);
  const [multipartJsonParseError, setMultipartJsonParseError] = useState<{ [key: number]: string }>({});
  const [openVariableDropdown, setOpenVariableDropdown] = useState<string | null>(null);
  const multipartButtonRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  const getMultipartButtonRef = (key: string): React.RefObject<HTMLButtonElement> => {
    if (!multipartButtonRefs.current[key]) {
      multipartButtonRefs.current[key] = React.createRef<HTMLButtonElement>();
    }
    return multipartButtonRefs.current[key];
  };

  useEffect(() => {
    const loadApiConfigs = async () => {
      try {
        const { data: secondaryData } = await supabase
          .from('secondary_api_configs')
          .select('id, name')
          .order('name');
        setSecondaryApis(secondaryData || []);

        const { data: authData } = await supabase
          .from('api_auth_config')
          .select('id, name')
          .order('name');
        setAuthConfigs(authData || []);
      } catch (err) {
        console.error('Error loading API configs:', err);
      }
    };
    loadApiConfigs();
  }, []);

  useEffect(() => {
    setLocalLabel(label);
    setLocalStepType(stepType);
    const newConfig = configJson || {};
    setConfig(newConfig);
    setLocalEscapeQuotes(escapeSingleQuotesInBody);
    setLocalResponseTemplate(userResponseTemplate);
  }, [nodeId, label, stepType, configJson, escapeSingleQuotesInBody, userResponseTemplate]);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    const updates = {
      label: localLabel,
      stepType: localStepType,
      configJson: config,
      escapeSingleQuotesInBody: localEscapeQuotes,
      userResponseTemplate: localResponseTemplate,
    };
    onUpdate(updates);
    if (onSaveNode && !nodeId.startsWith('temp-')) {
      onSaveNode(nodeId, updates).catch((err) => console.error('Failed to persist step:', err));
    }
    onClose();
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center space-x-2 w-full text-left py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
    >
      {expandedSections[id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      <span>{title}</span>
    </button>
  );

  const renderApiCallConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">HTTP Method</label>
        <select
          value={config.method || 'POST'}
          onChange={(e) => updateConfig('method', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL</label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => updateConfig('url', e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Headers (JSON)</label>
        <textarea
          value={typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers || {}, null, 2)}
          onChange={(e) => {
            try {
              updateConfig('headers', JSON.parse(e.target.value));
            } catch {
              updateConfig('headers', e.target.value);
            }
          }}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
        />
      </div>
      {config.method !== 'GET' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Request Body</label>
          <textarea
            value={config.requestBody || ''}
            onChange={(e) => updateConfig('requestBody', e.target.value)}
            rows={6}
            placeholder="Use {{variable}} for data references"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
          />
        </div>
      )}
      {renderResponseMappings()}
    </div>
  );

  const renderApiEndpointConfig = () => (
    <V2ApiEndpointConfig
      config={config}
      updateConfig={updateConfig}
      setConfig={setConfig}
      allNodes={allNodes}
      currentNodeId={nodeId}
    />
  );

  const renderConditionalConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Field Path</label>
        <input
          type="text"
          value={config.jsonPath || config.fieldPath || ''}
          onChange={(e) => { updateConfig('jsonPath', e.target.value); updateConfig('fieldPath', e.target.value); }}
          placeholder="e.g. response.status"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Operator</label>
        <select
          value={config.operator || config.conditionType || 'equals'}
          onChange={(e) => { updateConfig('operator', e.target.value); updateConfig('conditionType', e.target.value); }}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="not_contains">Not Contains</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
          <option value="exists">Exists</option>
          <option value="not_exists">Not Exists</option>
          <option value="is_null">Is Null</option>
          <option value="is_not_null">Is Not Null</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expected Value</label>
        <input
          type="text"
          value={config.expectedValue || ''}
          onChange={(e) => updateConfig('expectedValue', e.target.value)}
          placeholder="Value to compare against"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {renderAdditionalConditions()}
    </div>
  );

  const renderAdditionalConditions = () => {
    const conditions = config.additionalConditions || [];
    return (
      <div className="space-y-2">
        {conditions.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Logical Operator</label>
            <select
              value={config.logicalOperator || 'AND'}
              onChange={(e) => updateConfig('logicalOperator', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
        )}
        {conditions.map((cond: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-2">
            <input
              type="text"
              value={cond.jsonPath || ''}
              onChange={(e) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], jsonPath: e.target.value };
                updateConfig('additionalConditions', updated);
              }}
              placeholder="Field path"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <select
              value={cond.operator || 'equals'}
              onChange={(e) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], operator: e.target.value };
                updateConfig('additionalConditions', updated);
              }}
              className="w-28 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
            </select>
            <input
              type="text"
              value={cond.expectedValue || ''}
              onChange={(e) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], expectedValue: e.target.value };
                updateConfig('additionalConditions', updated);
              }}
              placeholder="Value"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => {
                const updated = conditions.filter((_: any, i: number) => i !== idx);
                updateConfig('additionalConditions', updated);
              }}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateConfig('additionalConditions', [...conditions, { jsonPath: '', operator: 'equals', expectedValue: '' }])}
          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Plus className="h-3 w-3" />
          <span>Add condition</span>
        </button>
      </div>
    );
  };

  const renderDataTransformConfig = () => {
    const transformations = config.transformations || [{ field_name: '', transformation: '' }];
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Transformations</label>
        {transformations.map((t: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-2">
            <input
              type="text"
              value={t.field_name || ''}
              onChange={(e) => {
                const updated = [...transformations];
                updated[idx] = { ...updated[idx], field_name: e.target.value };
                updateConfig('transformations', updated);
              }}
              placeholder="Field name"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              value={t.transformation || ''}
              onChange={(e) => {
                const updated = [...transformations];
                updated[idx] = { ...updated[idx], transformation: e.target.value };
                updateConfig('transformations', updated);
              }}
              placeholder="Transformation rule"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => {
                const updated = transformations.filter((_: any, i: number) => i !== idx);
                updateConfig('transformations', updated.length ? updated : [{ field_name: '', transformation: '' }]);
              }}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateConfig('transformations', [...transformations, { field_name: '', transformation: '' }])}
          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Plus className="h-3 w-3" />
          <span>Add transformation</span>
        </button>
      </div>
    );
  };

  const renderSftpUploadConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Upload Type</label>
        <select
          value={config.uploadType || 'csv'}
          onChange={(e) => updateConfig('uploadType', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xml">XML</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">SFTP Path Override</label>
        <input
          type="text"
          value={config.sftpPathOverride || ''}
          onChange={(e) => updateConfig('sftpPathOverride', e.target.value)}
          placeholder="/custom/path/"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={config.useApiResponseForFilename || false}
          onChange={(e) => updateConfig('useApiResponseForFilename', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        <label className="text-xs text-gray-600 dark:text-gray-400">Use API response for filename</label>
      </div>
      {config.useApiResponseForFilename && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filename Source Path</label>
          <input
            type="text"
            value={config.filenameSourcePath || ''}
            onChange={(e) => updateConfig('filenameSourcePath', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fallback Filename</label>
        <input
          type="text"
          value={config.fallbackFilename || ''}
          onChange={(e) => updateConfig('fallbackFilename', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">PDF Upload Strategy</label>
        <select
          value={config.pdfUploadStrategy || 'all_pages_in_group'}
          onChange={(e) => updateConfig('pdfUploadStrategy', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all_pages_in_group">All pages in group</option>
          <option value="specific_page_in_group">Specific page</option>
        </select>
      </div>
    </div>
  );

  const renderEmailConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
        <input
          type="text"
          value={config.to || ''}
          onChange={(e) => updateConfig('to', e.target.value)}
          placeholder="recipient@example.com or {{variable}}"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
        <input
          type="text"
          value={config.subject || ''}
          onChange={(e) => updateConfig('subject', e.target.value)}
          placeholder="Email subject"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Body</label>
        <textarea
          value={config.body || ''}
          onChange={(e) => updateConfig('body', e.target.value)}
          rows={5}
          placeholder="Email body text"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={config.includeAttachment !== false}
          onChange={(e) => updateConfig('includeAttachment', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        <label className="text-xs text-gray-600 dark:text-gray-400">Include attachment</label>
      </div>
      {config.includeAttachment !== false && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Attachment Source</label>
          <select
            value={config.attachmentSource || 'original_pdf'}
            onChange={(e) => updateConfig('attachmentSource', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="original_pdf">Original PDF</option>
            <option value="extracted_data">Extracted Data</option>
          </select>
        </div>
      )}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={config.ccUser || false}
          onChange={(e) => updateConfig('ccUser', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        <label className="text-xs text-gray-600 dark:text-gray-400">CC current user</label>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={config.isNotificationEmail || false}
          onChange={(e) => updateConfig('isNotificationEmail', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        <label className="text-xs text-gray-600 dark:text-gray-400">Use notification template</label>
      </div>
    </div>
  );

  const renderRenameFileConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filename Template</label>
        <input
          type="text"
          value={config.filenameTemplate || ''}
          onChange={(e) => updateConfig('filenameTemplate', e.target.value)}
          placeholder="{{OrderNumber}}_{{Date}}"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fallback Filename</label>
        <input
          type="text"
          value={config.fallbackFilename || ''}
          onChange={(e) => updateConfig('fallbackFilename', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={config.appendTimestamp || false}
          onChange={(e) => updateConfig('appendTimestamp', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        <label className="text-xs text-gray-600 dark:text-gray-400">Append timestamp</label>
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">File Types to Rename</label>
        <div className="flex flex-wrap gap-3">
          {['pdf', 'csv', 'json', 'xml'].map(ft => (
            <label key={ft} className="flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={ft === 'pdf' ? config.renamePdf !== false : config[`rename${ft.charAt(0).toUpperCase() + ft.slice(1)}`] || false}
                onChange={(e) => updateConfig(ft === 'pdf' ? 'renamePdf' : `rename${ft.charAt(0).toUpperCase() + ft.slice(1)}`, e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span>{ft.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const generateMultipartFieldMappings = (partIndex: number) => {
    const formParts = config.formParts || [];
    const part = formParts[partIndex];
    if (!part || part.type !== 'text' || !part.value?.trim()) return;

    try {
      const template = JSON.parse(part.value);
      const fieldMappings: Array<{ fieldName: string; type: 'hardcoded' | 'variable'; value: string; dataType: string }> = [];

      const extractFields = (obj: any, prefix: string = '') => {
        for (const key of Object.keys(obj)) {
          const fullPath = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];

          if (value === null || value === undefined) {
            fieldMappings.push({ fieldName: fullPath, type: 'hardcoded', value: '', dataType: 'string' });
          } else if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'object') {
              extractFields(value[0], `${fullPath}[0]`);
            }
          } else if (typeof value === 'object') {
            extractFields(value, fullPath);
          } else {
            let dataType = 'string';
            if (typeof value === 'number') {
              dataType = Number.isInteger(value) ? 'integer' : 'number';
            } else if (typeof value === 'boolean') {
              dataType = 'boolean';
            }
            fieldMappings.push({ fieldName: fullPath, type: 'hardcoded', value: String(value), dataType });
          }
        }
      };

      extractFields(template);

      const existingFieldNames = new Set((part.fieldMappings || []).map((m: any) => m.fieldName));
      const newMappings = fieldMappings.filter(m => !existingFieldNames.has(m.fieldName));
      const updated = [...formParts];
      updated[partIndex] = { ...updated[partIndex], fieldMappings: [...(part.fieldMappings || []), ...newMappings] };
      updateConfig('formParts', updated);
      setMultipartJsonParseError(prev => ({ ...prev, [partIndex]: '' }));
    } catch (error: any) {
      setMultipartJsonParseError(prev => ({ ...prev, [partIndex]: error.message || 'Invalid JSON format' }));
    }
  };

  const updateMultipartFieldMapping = (partIndex: number, mappingIndex: number, field: string, value: any) => {
    const formParts = [...(config.formParts || [])];
    const mappings = [...(formParts[partIndex].fieldMappings || [])];
    mappings[mappingIndex] = { ...mappings[mappingIndex], [field]: value };
    formParts[partIndex] = { ...formParts[partIndex], fieldMappings: mappings };
    updateConfig('formParts', formParts);
  };

  const removeMultipartFieldMapping = (partIndex: number, mappingIndex: number) => {
    const formParts = [...(config.formParts || [])];
    const mappings = (formParts[partIndex].fieldMappings || []).filter((_: any, i: number) => i !== mappingIndex);
    formParts[partIndex] = { ...formParts[partIndex], fieldMappings: mappings };
    updateConfig('formParts', formParts);
  };

  const addMultipartFieldMapping = (partIndex: number) => {
    const formParts = [...(config.formParts || [])];
    const mappings = [...(formParts[partIndex].fieldMappings || []), { fieldName: '', type: 'hardcoded' as const, value: '', dataType: 'string' }];
    formParts[partIndex] = { ...formParts[partIndex], fieldMappings: mappings };
    updateConfig('formParts', formParts);
  };

  const getMultipartVariables = (): Array<{ name: string; stepName: string; source: 'workflow'; dataType?: string }> => {
    const vars: Array<{ name: string; stepName: string; source: 'workflow'; dataType?: string }> = [];
    for (const node of allNodes) {
      if (node.id === nodeId) continue;
      const nodeMappings = node.data?.configJson?.responseDataMappings || node.config_json?.responseDataMappings || [];
      for (const m of nodeMappings) {
        if (m.updatePath && m.updatePath.trim()) {
          vars.push({ name: m.updatePath, stepName: `from ${node.data?.label || node.label || 'Step'}`, source: 'workflow', dataType: 'response mapping' });
        }
      }
    }
    return vars;
  };

  const renderMultipartConfig = () => {
    const formParts = config.formParts || [{ name: 'file', type: 'file', value: '', contentType: '' }];
    const apiSourceType = config.apiSourceType || 'main';
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start space-x-3">
            <Braces className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Multipart Form Upload</h5>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Upload PDF files via multipart/form-data with custom metadata fields.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Select
            label="API Source"
            value={apiSourceType}
            onValueChange={(v) => updateConfig('apiSourceType', v)}
            options={[
              { value: 'main', label: 'Main API' },
              { value: 'secondary', label: 'Secondary API' },
              { value: 'auth_config', label: 'Auth Config Only' }
            ]}
          />
        </div>

        {apiSourceType === 'secondary' && (
          <div>
            <Select
              label="Secondary API"
              value={config.secondaryApiId || ''}
              onValueChange={(v) => updateConfig('secondaryApiId', v)}
              options={secondaryApis.map(api => ({ value: api.id, label: api.name }))}
              placeholder="Select secondary API..."
            />
          </div>
        )}

        {apiSourceType === 'auth_config' && (
          <div>
            <Select
              label="Authentication Config"
              value={config.authConfigId || ''}
              onValueChange={(v) => updateConfig('authConfigId', v)}
              options={authConfigs.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select auth config..."
            />
          </div>
        )}

        {(apiSourceType === 'main' || apiSourceType === 'secondary') && (
          <div>
            <Select
              label="Authentication (Optional)"
              value={config.authConfigId || '__none__'}
              onValueChange={(v) => updateConfig('authConfigId', v === '__none__' ? '' : v)}
              options={[
                { value: '__none__', label: 'Use API source default' },
                ...authConfigs.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Override authentication. Configure in Settings &gt; API Settings &gt; Authentication.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">API URL</label>
          <input
            type="text"
            value={config.url || ''}
            onChange={(e) => updateConfig('url', e.target.value)}
            placeholder="https://api.example.com/upload or /api/Documents"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Full URL or path appended to base URL. Use {`{{variable}}`} for dynamic values.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Upload Filename Template</label>
          <input
            type="text"
            value={config.filenameTemplate || ''}
            onChange={(e) => updateConfig('filenameTemplate', e.target.value)}
            placeholder="e.g., {{orders[0].detailLineId}}_document.pdf"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Leave empty to use original filename. Use {`{{variable}}`} for dynamic naming.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Form Parts</label>
            <button
              type="button"
              onClick={() => updateConfig('formParts', [...formParts, { name: '', type: 'text', value: '', contentType: '' }])}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <Plus className="w-3 h-3" />
              <span>Add Part</span>
            </button>
          </div>

          <div className="space-y-3">
            {formParts.map((part: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={part.name || ''}
                      onChange={(e) => {
                        const updated = [...formParts];
                        updated[index] = { ...updated[index], name: e.target.value };
                        updateConfig('formParts', updated);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., properties"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select
                      value={part.type || 'text'}
                      onChange={(e) => {
                        const updated = [...formParts];
                        updated[index] = { ...updated[index], type: e.target.value };
                        updateConfig('formParts', updated);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="text">Text</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                  {part.type === 'text' && (
                    <>
                      <div className="col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Value</label>
                          {(part.contentType || '').toLowerCase().includes('json') && (
                            <button
                              type="button"
                              onClick={() => generateMultipartFieldMappings(index)}
                              className="flex items-center px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Map JSON
                            </button>
                          )}
                        </div>
                        <textarea
                          value={part.value || ''}
                          onChange={(e) => {
                            const updated = [...formParts];
                            updated[index] = { ...updated[index], value: e.target.value };
                            updateConfig('formParts', updated);
                            if (multipartJsonParseError[index]) {
                              setMultipartJsonParseError(prev => ({ ...prev, [index]: '' }));
                            }
                          }}
                          rows={3}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 font-mono"
                          placeholder='{"key": "value", "In_DocName": "{{variable}}"}'
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Content-Type</label>
                        <input
                          type="text"
                          value={part.contentType || ''}
                          onChange={(e) => {
                            const updated = [...formParts];
                            updated[index] = { ...updated[index], contentType: e.target.value };
                            updateConfig('formParts', updated);
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                          placeholder="application/json"
                        />
                      </div>
                    </>
                  )}
                  {part.type === 'file' && (
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">File Source</label>
                      <div className="px-2 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                        PDF from workflow context
                      </div>
                    </div>
                  )}
                  <div className="col-span-1 pt-5">
                    {formParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formParts.filter((_: any, i: number) => i !== index);
                          updateConfig('formParts', updated);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {multipartJsonParseError[index] && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-300 font-mono">{multipartJsonParseError[index]}</p>
                  </div>
                )}

                {part.type === 'text' && part.fieldMappings && part.fieldMappings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Field Mappings</label>
                      <button
                        type="button"
                        onClick={() => addMultipartFieldMapping(index)}
                        className="flex items-center px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {part.fieldMappings.map((mapping: any, mappingIndex: number) => (
                        <div
                          key={mappingIndex}
                          className={`p-2 rounded border ${
                            mapping.type === 'hardcoded'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Field</label>
                              <input
                                type="text"
                                value={mapping.fieldName || ''}
                                onChange={(e) => updateMultipartFieldMapping(index, mappingIndex, 'fieldName', e.target.value)}
                                className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="fieldName"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Type</label>
                              <select
                                value={mapping.type || 'hardcoded'}
                                onChange={(e) => updateMultipartFieldMapping(index, mappingIndex, 'type', e.target.value)}
                                className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="hardcoded">Hardcoded</option>
                                <option value="variable">Variable</option>
                              </select>
                            </div>
                            <div className="col-span-4">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Value</label>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={mapping.value || ''}
                                  onChange={(e) => updateMultipartFieldMapping(index, mappingIndex, 'value', e.target.value)}
                                  className="flex-1 px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder={mapping.type === 'hardcoded' ? 'value' : '{{variable}}'}
                                />
                                {mapping.type === 'variable' && (
                                  <>
                                    <button
                                      ref={getMultipartButtonRef(`mp_${index}_${mappingIndex}`) as any}
                                      type="button"
                                      onClick={() => setOpenVariableDropdown(openVariableDropdown === `mp_${index}_${mappingIndex}` ? null : `mp_${index}_${mappingIndex}`)}
                                      className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                    >
                                      <Braces className="w-3 h-3" />
                                    </button>
                                    <VariableDropdown
                                      isOpen={openVariableDropdown === `mp_${index}_${mappingIndex}`}
                                      onClose={() => setOpenVariableDropdown(null)}
                                      triggerRef={getMultipartButtonRef(`mp_${index}_${mappingIndex}`)}
                                      variables={getMultipartVariables()}
                                      onSelect={(varName) => {
                                        const current = mapping.value || '';
                                        updateMultipartFieldMapping(index, mappingIndex, 'value', current + `{{${varName}}}`);
                                        setOpenVariableDropdown(null);
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Data Type</label>
                              <select
                                value={mapping.dataType || 'string'}
                                onChange={(e) => updateMultipartFieldMapping(index, mappingIndex, 'dataType', e.target.value)}
                                className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="string">String</option>
                                <option value="integer">Integer</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                              </select>
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeMultipartFieldMapping(index, mappingIndex)}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Configure form-data parts. The "file" type part will include the PDF from the workflow.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Response Data Mappings</label>
            <button
              type="button"
              onClick={() => updateConfig('responseDataMappings', [...(config.responseDataMappings || []), { responsePath: '', updatePath: '' }])}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <Plus className="w-3 h-3" />
              <span>Add Mapping</span>
            </button>
          </div>

          {(config.responseDataMappings || []).length > 0 && (
            <div className="space-y-2">
              {(config.responseDataMappings || []).map((mapping: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={mapping.responsePath || ''}
                    onChange={(e) => {
                      const updated = [...(config.responseDataMappings || [])];
                      updated[index] = { ...updated[index], responsePath: e.target.value };
                      updateConfig('responseDataMappings', updated);
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Response path (e.g., data.id)"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="text"
                    value={mapping.updatePath || ''}
                    onChange={(e) => {
                      const updated = [...(config.responseDataMappings || [])];
                      updated[index] = { ...updated[index], updatePath: e.target.value };
                      updateConfig('responseDataMappings', updated);
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Context path (e.g., documentId)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (config.responseDataMappings || []).filter((_: any, i: number) => i !== index);
                      updateConfig('responseDataMappings', updated);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Map values from the API response to context variables for use in subsequent steps.
          </p>
        </div>
      </div>
    );
  };

  const renderResponseMappings = () => {
    const mappings = config.responseDataMappings || [];
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Response Data Mappings</label>
        {mappings.map((m: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-2">
            <input
              type="text"
              value={m.responsePath || ''}
              onChange={(e) => {
                const updated = [...mappings];
                updated[idx] = { ...updated[idx], responsePath: e.target.value };
                updateConfig('responseDataMappings', updated);
              }}
              placeholder="Response path"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-400 text-xs">-&gt;</span>
            <input
              type="text"
              value={m.updatePath || ''}
              onChange={(e) => {
                const updated = [...mappings];
                updated[idx] = { ...updated[idx], updatePath: e.target.value };
                updateConfig('responseDataMappings', updated);
              }}
              placeholder="Update path"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => {
                const updated = mappings.filter((_: any, i: number) => i !== idx);
                updateConfig('responseDataMappings', updated);
              }}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateConfig('responseDataMappings', [...mappings, { responsePath: '', updatePath: '' }])}
          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Plus className="h-3 w-3" />
          <span>Add mapping</span>
        </button>
      </div>
    );
  };

  const renderStepConfig = () => {
    switch (localStepType) {
      case 'api_call': return renderApiCallConfig();
      case 'api_endpoint': return renderApiEndpointConfig();
      case 'conditional_check': return renderConditionalConfig();
      case 'data_transform': return renderDataTransformConfig();
      case 'sftp_upload': return renderSftpUploadConfig();
      case 'email_action': return renderEmailConfig();
      case 'rename_file': return renderRenameFileConfig();
      case 'multipart_form_upload': return renderMultipartConfig();
      case 'ai_decision': return (
        <V2AiDecisionConfig
          config={config}
          updateConfig={updateConfig}
          setConfig={setConfig}
          allNodes={allNodes}
          currentNodeId={nodeId}
        />
      );
      case 'imaging': return (
        <V2ImagingConfig
          config={config}
          updateConfig={updateConfig}
        />
      );
      case 'read_email': return (
        <V2ReadEmailConfig
          config={config}
          updateConfig={updateConfig}
          setConfig={setConfig}
        />
      );
      default: return <p className="text-sm text-gray-500">Select a step type to configure.</p>;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Step Configuration</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure step behavior and parameters</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete step"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <SectionHeader id="basic" title="Basic Settings" />
          {expandedSections.basic && (
            <div className="space-y-4 pl-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                  <input
                    type="text"
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Step Type</label>
                  <select
                    value={localStepType}
                    onChange={(e) => {
                      setLocalStepType(e.target.value);
                      setConfig({});
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STEP_TYPES.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localEscapeQuotes}
                  onChange={(e) => setLocalEscapeQuotes(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label className="text-sm text-gray-600 dark:text-gray-400">Escape single quotes in body</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Response Message
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localResponseTemplate}
                    onChange={(e) => setLocalResponseTemplate(e.target.value)}
                    placeholder="e.g., Found Client ID: {orders.0.consignee.clientId}"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    ref={responseVarBtnRef}
                    onClick={() => setShowResponseVarDropdown(!showResponseVarDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded"
                    title="Insert variable"
                  >
                    <Braces className="w-4 h-4" />
                  </button>
                  <VariableDropdown
                    isOpen={showResponseVarDropdown}
                    onClose={() => setShowResponseVarDropdown(false)}
                    onSelect={(variableName) => {
                      setLocalResponseTemplate(prev => prev + `{${variableName}}`);
                      setShowResponseVarDropdown(false);
                    }}
                    variables={[
                      ...(config.responseDataMappings || [])
                        .filter((m: any) => m.updatePath && m.updatePath.trim() !== '')
                        .map((m: any) => ({
                          name: m.updatePath,
                          stepName: `Stored at: ${m.updatePath}`,
                          source: 'workflow' as const,
                          dataType: 'response mapping'
                        })),
                      ...allNodes
                        .filter(n => n.id !== nodeId && n.config_json?.responseDataMappings)
                        .flatMap(n => (n.config_json.responseDataMappings || [])
                          .filter((m: any) => m.updatePath && m.updatePath.trim() !== '')
                          .map((m: any) => ({
                            name: m.updatePath,
                            stepName: `from ${n.label || 'Step'}`,
                            source: 'workflow' as const,
                            dataType: 'response mapping'
                          }))
                        )
                    ]}
                    triggerRef={responseVarBtnRef}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Message shown to users during workflow execution. Use {'{variableName}'} to include dynamic values.
                </p>
              </div>
            </div>
          )}

          <SectionHeader id="config" title="Step Configuration" />
          {expandedSections.config && (
            <div className="pl-2">
              {renderStepConfig()}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save Step
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

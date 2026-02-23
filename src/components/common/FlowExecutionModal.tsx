import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, ChevronLeft, Loader2, AlertCircle, CheckCircle, Check, HelpCircle, LogOut, RotateCcw, Plus, ExternalLink, ScanBarcode, Phone, Camera, Delete } from 'lucide-react';
import { getAuthHeaders } from '../../lib/supabase';
import { TextField, NumberField, DateField, DateTimeField, PhoneField, ZipField, PostalCodeField, ProvinceField, StateField, DropdownField, TimeField } from '../form-fields';

export interface ExecuteButtonGroup {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isArrayGroup: boolean;
  arrayMinRows: number;
  arrayMaxRows: number;
  arrayFieldName: string;
}

export interface ExecuteButtonField {
  id: string;
  groupId: string;
  name: string;
  fieldKey: string;
  fieldType: string;
  isRequired?: boolean;
  defaultValue?: string | null;
  options?: any[];
  dropdownDisplayMode?: 'description_only' | 'value_and_description';
  sortOrder?: number;
  placeholder?: string | null;
  helpText?: string | null;
  maxLength?: number | null;
  conditionalRequiredFieldId?: string | null;
  conditionalRequiredOperator?: string | null;
  conditionalRequiredValue?: string | null;
}

export interface FlowNodeMapping {
  nodeId: string;
  groupId: string;
  fieldMappings: Record<string, { variablePath: string; applyCondition: string }>;
  headerContent?: string;
  displayWithPrevious?: boolean;
}

interface StepResult {
  node?: string;
  step?: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  requestUrl?: string;
  requestBody?: string;
  httpMethod?: string;
}

interface FlowExecutionModalProps {
  buttonId: string;
  buttonName: string;
  groups: ExecuteButtonGroup[];
  fields: ExecuteButtonField[];
  flowNodeMappings: FlowNodeMapping[];
  onClose: () => void;
  title?: string;
  userId?: string;
}

function NumberPadUI({ onSubmit, onCancel, inputLabel, isExecuting }: { onSubmit: (val: string) => void; onCancel: () => void; inputLabel: string; isExecuting: boolean }) {
  const [value, setValue] = useState('');

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      setValue(prev => prev.slice(0, -1));
    } else if (key === '+') {
      if (value === '') setValue('+');
    } else {
      setValue(prev => prev + key);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', 'backspace'];

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <Phone className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{inputLabel}</h3>

          <div className="w-full max-w-xs">
            <div className="text-center text-2xl font-mono tracking-wider bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 min-h-[52px] text-gray-900 dark:text-gray-100">
              {value || <span className="text-gray-400">---</span>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`h-14 rounded-lg text-lg font-medium transition-all active:scale-95 ${
                    key === 'backspace'
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {key === 'backspace' ? <Delete className="h-5 w-5 mx-auto" /> : key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(value)}
          disabled={!value || isExecuting}
          className="flex items-center px-6 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit
        </button>
      </div>
    </>
  );
}

function BarcodeScannerUI({ onSubmit, onCancel, inputLabel, isExecuting }: { onSubmit: (val: string) => void; onCancel: () => void; inputLabel: string; isExecuting: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedValue, setScannedValue] = useState('');
  const [error, setError] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    setScannedValue('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'itf', 'codabar']
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedValue = barcodes[0].rawValue;
                setScannedValue(detectedValue);
                stopCamera();
              }
            } catch {}
          }
        }, 250);
      } else {
        setError('Barcode detection is not supported in this browser. Please enter the value manually.');
        setManualEntry(true);
        stopCamera();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera access or enter the value manually.');
      } else {
        setError('Could not access camera. Please enter the value manually.');
      }
      setManualEntry(true);
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <ScanBarcode className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{inputLabel}</h3>

          {error && (
            <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {!scanning && !scannedValue && !manualEntry && (
            <button
              onClick={startCamera}
              className="flex items-center space-x-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span>Open Camera</span>
            </button>
          )}

          {scanning && (
            <div className="w-full max-w-sm relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg border-2 border-sky-400"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/3 border-2 border-sky-400 rounded-lg opacity-60" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                Point camera at barcode
              </p>
              <button
                onClick={stopCamera}
                className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Stop Camera
              </button>
            </div>
          )}

          {scannedValue && (
            <div className="w-full max-w-sm">
              <div className="text-center text-xl font-mono bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-800 dark:text-green-200">
                {scannedValue}
              </div>
              <button
                onClick={() => { setScannedValue(''); startCamera(); }}
                className="mt-2 w-full text-sm text-sky-600 dark:text-sky-400 hover:underline"
              >
                Scan again
              </button>
            </div>
          )}

          {(manualEntry || (!scanning && !scannedValue)) && (
            <div className="w-full max-w-sm mt-2">
              <button
                onClick={() => setManualEntry(true)}
                className={`text-sm text-sky-600 dark:text-sky-400 hover:underline ${manualEntry ? 'hidden' : ''}`}
              >
                Enter manually instead
              </button>
              {manualEntry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Entry</label>
                  <input
                    type="text"
                    value={scannedValue}
                    onChange={(e) => setScannedValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Enter barcode value"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <button
          onClick={() => { stopCamera(); onCancel(); }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(scannedValue)}
          disabled={!scannedValue || isExecuting}
          className="flex items-center px-6 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit
        </button>
      </div>
    </>
  );
}

function UserInputUI({ inputType, inputLabel, isExecuting, onSubmit, onCancel }: { inputType: 'barcode_scanner' | 'number_pad'; inputLabel: string; isExecuting: boolean; onSubmit: (val: string) => void; onCancel: () => void }) {
  if (inputType === 'number_pad') {
    return <NumberPadUI onSubmit={onSubmit} onCancel={onCancel} inputLabel={inputLabel} isExecuting={isExecuting} />;
  }
  return <BarcodeScannerUI onSubmit={onSubmit} onCancel={onCancel} inputLabel={inputLabel} isExecuting={isExecuting} />;
}

export default function FlowExecutionModal({
  buttonId,
  buttonName,
  groups,
  fields,
  flowNodeMappings,
  onClose,
  title,
  userId = 'user'
}: FlowExecutionModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [arrayData, setArrayData] = useState<Record<string, Record<string, any>[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionResults, setExecutionResults] = useState<{
    success: boolean;
    results: StepResult[];
    error?: string;
    contextData?: any;
    message?: string;
  } | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<{
    promptMessage: string;
    yesButtonLabel: string;
    noButtonLabel: string;
    pendingContextData: any;
    showLocationMap?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  } | null>(null);
  const [userInputPrompt, setUserInputPrompt] = useState<{
    inputType: 'barcode_scanner' | 'number_pad';
    inputLabel: string;
    variableName: string;
    pendingContextData: any;
  } | null>(null);
  const [exitData, setExitData] = useState<{
    exitMessage: string;
    showRestartButton: boolean;
  } | null>(null);
  const [contextData, setContextData] = useState<any>(null);
  const [stepPath, setStepPath] = useState<ExecuteButtonGroup[][]>([]);

  const getCombinedStepForGroup = useCallback((groupId: string): ExecuteButtonGroup[] => {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return [];

    const result: ExecuteButtonGroup[] = [groups[groupIndex]];

    for (let i = groupIndex + 1; i < groups.length; i++) {
      const nodeMapping = flowNodeMappings.find(m => m.groupId === groups[i].id);
      if (nodeMapping?.displayWithPrevious) {
        result.push(groups[i]);
      } else {
        break;
      }
    }

    return result;
  }, [groups, flowNodeMappings]);

  const currentStepGroups = stepPath[currentStep] || [];
  const totalSteps = stepPath.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const resolveVariable = useCallback((template: string, ctx: any): string => {
    if (!template || typeof template !== 'string' || !ctx) return template;
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      const parts = trimmedPath.split('.');
      let value: any = ctx;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match;
        }
      }
      return value !== undefined && value !== null ? String(value) : match;
    });
  }, []);

  useEffect(() => {
    if (groups.length > 0 && stepPath.length === 0) {
      const firstStep = getCombinedStepForGroup(groups[0].id);
      if (firstStep.length > 0) {
        setStepPath([firstStep]);
      }
    }
  }, [groups, stepPath.length, getCombinedStepForGroup]);

  useEffect(() => {
    const initialData: Record<string, any> = {};
    const initialArrayData: Record<string, Record<string, any>[]> = {};

    groups.forEach(group => {
      if (group.isArrayGroup && group.arrayFieldName) {
        const groupFields = fields.filter(f => f.groupId === group.id);
        const initialRows: Record<string, any>[] = [];
        for (let i = 0; i < group.arrayMinRows; i++) {
          const row: Record<string, any> = {};
          groupFields.forEach(field => {
            if (field.defaultValue) {
              row[field.fieldKey] = field.defaultValue;
            } else if (field.fieldType === 'checkbox') {
              row[field.fieldKey] = 'False';
            } else {
              row[field.fieldKey] = '';
            }
          });
          initialRows.push(row);
        }
        initialArrayData[group.arrayFieldName] = initialRows;
      }
    });

    fields.forEach(field => {
      const group = groups.find(g => g.id === field.groupId);
      if (group?.isArrayGroup) return;

      if (field.defaultValue) {
        initialData[field.fieldKey] = field.defaultValue;
      } else if (field.fieldType === 'checkbox') {
        initialData[field.fieldKey] = 'False';
      }
    });

    setFormData(initialData);
    setArrayData(initialArrayData);
  }, [fields, groups]);

  const applyFieldMappings = useCallback((groupId: string, ctx: any, edgeHandleTaken?: string) => {
    const nodeMapping = flowNodeMappings.find(m => m.groupId === groupId);

    if (!nodeMapping || !nodeMapping.fieldMappings || Object.keys(nodeMapping.fieldMappings).length === 0) {
      return;
    }

    const newFormData: Record<string, any> = {};
    let hasChanges = false;

    Object.entries(nodeMapping.fieldMappings).forEach(([fieldKey, mapping]) => {
      const variablePath = typeof mapping === 'string' ? mapping : mapping.variablePath;
      const applyCondition = typeof mapping === 'string' ? 'always' : (mapping.applyCondition || 'always');

      const shouldApply =
        applyCondition === 'always' ||
        (applyCondition === 'on_success' && edgeHandleTaken === 'success') ||
        (applyCondition === 'on_failure' && edgeHandleTaken === 'failure');

      if (!shouldApply) {
        return;
      }

      if (variablePath && ctx) {
        const parts = variablePath.split('.');
        let value: any = ctx;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        if (value !== undefined && value !== null) {
          newFormData[fieldKey] = String(value);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setFormData(prev => ({ ...prev, ...newFormData }));
    }
  }, [flowNodeMappings]);

  useEffect(() => {
    if (currentStepGroups.length > 0 && contextData) {
      const edgeHandleTaken = contextData.lastEdgeHandle || contextData.edgeHandleTaken;
      currentStepGroups.forEach(group => {
        applyFieldMappings(group.id, contextData, edgeHandleTaken);
      });
    }
  }, [currentStep, currentStepGroups, contextData, applyFieldMappings]);

  const checkConditionalRequired = (field: ExecuteButtonField, allFieldValues: Record<string, any>): boolean => {
    if (!field.conditionalRequiredFieldId || !field.conditionalRequiredOperator) return false;
    const depField = fields.find(f => f.id === field.conditionalRequiredFieldId);
    if (!depField) return false;
    const depValue = allFieldValues[depField.fieldKey];
    const hasValue = depValue !== undefined && depValue !== null && depValue !== '';
    switch (field.conditionalRequiredOperator) {
      case 'not_null': return hasValue;
      case 'null': return !hasValue;
      case 'starts_with': return hasValue && typeof depValue === 'string' && depValue.startsWith(field.conditionalRequiredValue || '');
      case 'contains': return hasValue && typeof depValue === 'string' && depValue.includes(field.conditionalRequiredValue || '');
      default: return false;
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    currentStepGroups.forEach(group => {
      const groupFields = fields.filter(f => f.groupId === group.id);

      if (group.isArrayGroup && group.arrayFieldName) {
        const rows = arrayData[group.arrayFieldName] || [];
        rows.forEach((row, rowIndex) => {
          groupFields.forEach(field => {
            const value = row[field.fieldKey];
            const errorKey = `${group.arrayFieldName}[${rowIndex}].${field.fieldKey}`;

            const isEffectivelyRequired = field.isRequired || checkConditionalRequired(field, row);
            if (isEffectivelyRequired) {
              if (value === undefined || value === null || value === '') {
                newErrors[errorKey] = `${field.name} is required`;
                return;
              }
            }

            if (field.fieldType === 'email' && value) {
              if (!emailRegex.test(value)) {
                newErrors[errorKey] = 'Please enter a valid email address';
              }
            }
          });
        });
      } else {
        groupFields.forEach(field => {
          const value = formData[field.fieldKey];

          const isEffectivelyRequired = field.isRequired || checkConditionalRequired(field, formData);
          if (isEffectivelyRequired) {
            if (value === undefined || value === null || value === '') {
              newErrors[field.fieldKey] = `${field.name} is required`;
              return;
            }
          }

          if (field.fieldType === 'email' && value) {
            if (!emailRegex.test(value)) {
              newErrors[field.fieldKey] = 'Please enter a valid email address';
            }
          }
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleExecute = async () => {
    if (!validateCurrentStep()) return;

    setIsExecuting(true);
    setExecutionResults(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const currentGroup = currentStepGroups[0];
      const currentGroupNodeId = currentGroup
        ? flowNodeMappings.find(m => m.groupId === currentGroup.id)?.nodeId
        : undefined;

      const executeParameters = { ...formData, ...arrayData };
      const headers = await getAuthHeaders();

      const response = await fetch(`${supabaseUrl}/functions/v1/execute-button-processor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buttonId,
          executeParameters,
          userId,
          currentGroupNodeId,
          existingContextData: contextData,
        }),
      });

      const result = await response.json();

      if (result.requiresConfirmation && result.confirmationData) {
        setConfirmationPrompt({
          promptMessage: result.confirmationData.promptMessage,
          yesButtonLabel: result.confirmationData.yesButtonLabel,
          noButtonLabel: result.confirmationData.noButtonLabel,
          pendingContextData: result.pendingContextData,
          showLocationMap: result.confirmationData.showLocationMap,
          latitude: result.confirmationData.latitude,
          longitude: result.confirmationData.longitude,
        });
        return;
      }

      if (result.requiresInput && result.inputData) {
        setUserInputPrompt({
          inputType: result.inputData.inputType,
          inputLabel: result.inputData.inputLabel,
          variableName: result.inputData.variableName,
          pendingContextData: result.pendingContextData,
        });
        return;
      }

      if (result.exitData) {
        setExitData({
          exitMessage: result.exitData.exitMessage,
          showRestartButton: result.exitData.showRestartButton,
        });
        setExecutionComplete(true);
        return;
      }

      if (result.contextData) {
        setContextData(result.contextData);
      }

      if (result.nextGroupNode) {
        const nextStep = getCombinedStepForGroup(result.nextGroupNode.groupId);
        if (nextStep.length > 0) {
          const nextGroupFields = fields.filter(f => f.groupId === result.nextGroupNode.groupId);
          const newFormData: Record<string, any> = { ...formData };
          nextGroupFields.forEach(field => {
            if (field.fieldType === 'checkbox') {
              newFormData[field.fieldKey] = 'False';
            } else {
              newFormData[field.fieldKey] = field.defaultValue && !field.defaultValue.includes('{{') ? field.defaultValue : '';
            }
          });
          setFormData(newFormData);
          setStepPath(prev => [...prev, nextStep]);
          setCurrentStep(prev => prev + 1);
          return;
        }
      }

      setExecutionResults({
        success: result.success,
        results: result.results || [],
        error: result.error,
        contextData: result.contextData,
      });
      setExecutionComplete(true);
    } catch (err: any) {
      setExecutionResults({
        success: false,
        results: [],
        error: err.message || 'Unknown error occurred',
      });
      setExecutionComplete(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setExecutionComplete(false);
    setExecutionResults(null);
    setConfirmationPrompt(null);
    setUserInputPrompt(null);
    setExitData(null);
    setCurrentStep(0);
    setContextData(null);

    if (groups.length > 0) {
      const firstStep = getCombinedStepForGroup(groups[0].id);
      setStepPath(firstStep.length > 0 ? [firstStep] : []);
    } else {
      setStepPath([]);
    }

    const initialData: Record<string, any> = {};
    const initialArrayData: Record<string, Record<string, any>[]> = {};

    groups.forEach(group => {
      if (group.isArrayGroup && group.arrayFieldName) {
        const groupFields = fields.filter(f => f.groupId === group.id);
        const initialRows: Record<string, any>[] = [];
        for (let i = 0; i < group.arrayMinRows; i++) {
          const row: Record<string, any> = {};
          groupFields.forEach(field => {
            if (field.defaultValue) {
              row[field.fieldKey] = field.defaultValue;
            } else if (field.fieldType === 'checkbox') {
              row[field.fieldKey] = 'False';
            } else {
              row[field.fieldKey] = '';
            }
          });
          initialRows.push(row);
        }
        initialArrayData[group.arrayFieldName] = initialRows;
      }
    });

    fields.forEach(field => {
      const group = groups.find(g => g.id === field.groupId);
      if (group?.isArrayGroup) return;

      if (field.defaultValue) {
        initialData[field.fieldKey] = field.defaultValue;
      } else if (field.fieldType === 'checkbox') {
        initialData[field.fieldKey] = 'False';
      }
    });

    setFormData(initialData);
    setArrayData(initialArrayData);
    setErrors({});
  };

  const handleConfirmationResponse = async (response: boolean) => {
    if (!confirmationPrompt) return;

    setIsExecuting(true);
    setConfirmationPrompt(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getAuthHeaders();

      const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/execute-button-processor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buttonId,
          executeParameters: formData,
          userId,
          userConfirmationResponse: response,
          pendingContextData: confirmationPrompt.pendingContextData,
        }),
      });

      const result = await fetchResponse.json();

      if (result.requiresConfirmation && result.confirmationData) {
        setConfirmationPrompt({
          promptMessage: result.confirmationData.promptMessage,
          yesButtonLabel: result.confirmationData.yesButtonLabel,
          noButtonLabel: result.confirmationData.noButtonLabel,
          pendingContextData: result.pendingContextData,
          showLocationMap: result.confirmationData.showLocationMap,
          latitude: result.confirmationData.latitude,
          longitude: result.confirmationData.longitude,
        });
        return;
      }

      if (result.requiresInput && result.inputData) {
        setUserInputPrompt({
          inputType: result.inputData.inputType,
          inputLabel: result.inputData.inputLabel,
          variableName: result.inputData.variableName,
          pendingContextData: result.pendingContextData,
        });
        return;
      }

      if (result.exitData) {
        setExitData({
          exitMessage: result.exitData.exitMessage,
          showRestartButton: result.exitData.showRestartButton,
        });
        setExecutionComplete(true);
        return;
      }

      if (result.contextData) {
        setContextData(result.contextData);
        if (result.nextGroupNode) {
          const nextStep = getCombinedStepForGroup(result.nextGroupNode.groupId);
          if (nextStep.length > 0) {
            const nextGroupFields = fields.filter(f => f.groupId === result.nextGroupNode.groupId);
            const newFormData: Record<string, any> = { ...formData };

            nextGroupFields.forEach(field => {
              if (field.fieldType === 'checkbox') {
                newFormData[field.fieldKey] = 'False';
              } else {
                newFormData[field.fieldKey] = field.defaultValue && !field.defaultValue.includes('{{') ? field.defaultValue : '';
              }
            });

            setFormData(newFormData);
            setStepPath(prev => [...prev, nextStep]);
            setCurrentStep(prev => prev + 1);
            return;
          }
        }
      }

      setExecutionResults({
        success: result.success,
        results: result.results || [],
        error: result.error,
        contextData: result.contextData,
        message: result.message,
      });
      setExecutionComplete(true);
    } catch (err: any) {
      setExecutionResults({
        success: false,
        results: [],
        error: err.message || 'Unknown error occurred',
      });
      setExecutionComplete(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUserInputSubmit = async (value: string) => {
    if (!userInputPrompt) return;

    setIsExecuting(true);
    setUserInputPrompt(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getAuthHeaders();

      const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/execute-button-processor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buttonId,
          executeParameters: formData,
          userId,
          userInputResponse: {
            variableName: userInputPrompt.variableName,
            value,
          },
          pendingContextData: userInputPrompt.pendingContextData,
        }),
      });

      const result = await fetchResponse.json();

      if (result.requiresConfirmation && result.confirmationData) {
        setConfirmationPrompt({
          promptMessage: result.confirmationData.promptMessage,
          yesButtonLabel: result.confirmationData.yesButtonLabel,
          noButtonLabel: result.confirmationData.noButtonLabel,
          pendingContextData: result.pendingContextData,
          showLocationMap: result.confirmationData.showLocationMap,
          latitude: result.confirmationData.latitude,
          longitude: result.confirmationData.longitude,
        });
        return;
      }

      if (result.requiresInput && result.inputData) {
        setUserInputPrompt({
          inputType: result.inputData.inputType,
          inputLabel: result.inputData.inputLabel,
          variableName: result.inputData.variableName,
          pendingContextData: result.pendingContextData,
        });
        return;
      }

      if (result.exitData) {
        setExitData({
          exitMessage: result.exitData.exitMessage,
          showRestartButton: result.exitData.showRestartButton,
        });
        setExecutionComplete(true);
        return;
      }

      if (result.contextData) {
        setContextData(result.contextData);
        if (result.nextGroupNode) {
          const nextStep = getCombinedStepForGroup(result.nextGroupNode.groupId);
          if (nextStep.length > 0) {
            const nextGroupFields = fields.filter(f => f.groupId === result.nextGroupNode.groupId);
            const newFormData: Record<string, any> = { ...formData };
            nextGroupFields.forEach(field => {
              if (field.fieldType === 'checkbox') {
                newFormData[field.fieldKey] = 'False';
              } else {
                newFormData[field.fieldKey] = field.defaultValue && !field.defaultValue.includes('{{') ? field.defaultValue : '';
              }
            });
            setFormData(newFormData);
            setStepPath(prev => [...prev, nextStep]);
            setCurrentStep(prev => prev + 1);
            return;
          }
        }
      }

      setExecutionResults({
        success: result.success,
        results: result.results || [],
        error: result.error,
        contextData: result.contextData,
        message: result.message,
      });
      setExecutionComplete(true);
    } catch (err: any) {
      setExecutionResults({
        success: false,
        results: [],
        error: err.message || 'Unknown error occurred',
      });
      setExecutionComplete(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderField = (buttonField: ExecuteButtonField) => {
    const value = formData[buttonField.fieldKey] ?? '';
    const error = errors[buttonField.fieldKey];
    const isEffectivelyRequired = buttonField.isRequired || checkConditionalRequired(buttonField, formData);

    const fieldObj = {
      id: buttonField.id,
      fieldLabel: buttonField.name,
      fieldType: buttonField.fieldType,
      isRequired: isEffectivelyRequired,
      placeholder: buttonField.placeholder || '',
      helpText: buttonField.helpText || '',
      maxLength: buttonField.maxLength || 0,
      dropdownOptions: buttonField.options || [],
      dropdownDisplayMode: buttonField.dropdownDisplayMode || 'description_only'
    };

    const commonProps = {
      field: fieldObj,
      value,
      onChange: (val: any) => handleFieldChange(buttonField.fieldKey, val),
      error,
      showIcon: false
    };

    switch (buttonField.fieldType) {
      case 'number':
        return <NumberField key={buttonField.id} {...commonProps} />;
      case 'date':
        return <DateField key={buttonField.id} {...commonProps} />;
      case 'datetime':
        return <DateTimeField key={buttonField.id} {...commonProps} />;
      case 'phone':
        return <PhoneField key={buttonField.id} {...commonProps} />;
      case 'zip':
        return <ZipField key={buttonField.id} {...commonProps} />;
      case 'postal_code':
        return <PostalCodeField key={buttonField.id} {...commonProps} />;
      case 'province':
        return <ProvinceField key={buttonField.id} {...commonProps} />;
      case 'state':
        return <StateField key={buttonField.id} {...commonProps} />;
      case 'time':
        return <TimeField key={buttonField.id} {...commonProps} />;
      case 'dropdown':
        return <DropdownField key={buttonField.id} {...commonProps} formData={formData} />;
      case 'email':
        return <TextField key={buttonField.id} {...commonProps} />;
      case 'checkbox':
        return (
          <div key={buttonField.id} className="space-y-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'True'}
                onChange={(e) => handleFieldChange(buttonField.fieldKey, e.target.checked ? 'True' : 'False')}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {buttonField.name}
                {isEffectivelyRequired && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {buttonField.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">{buttonField.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500 ml-8">{error}</p>}
          </div>
        );
      default:
        return <TextField key={buttonField.id} {...commonProps} />;
    }
  };

  const renderArrayGroup = (group: ExecuteButtonGroup) => {
    const rows = arrayData[group.arrayFieldName] || [];
    const canAddRow = rows.length < group.arrayMaxRows;
    const canRemoveRow = rows.length > group.arrayMinRows;
    const groupFields = fields.filter(f => f.groupId === group.id);

    const handleArrayFieldChange = (rowIndex: number, fieldKey: string, value: any) => {
      setArrayData(prev => {
        const updatedRows = [...(prev[group.arrayFieldName] || [])];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [fieldKey]: value };
        return { ...prev, [group.arrayFieldName]: updatedRows };
      });
    };

    const addRow = () => {
      if (rows.length >= group.arrayMaxRows) return;
      const newRow: Record<string, any> = {};
      groupFields.forEach(field => {
        if (field.defaultValue) {
          newRow[field.fieldKey] = field.defaultValue;
        } else if (field.fieldType === 'checkbox') {
          newRow[field.fieldKey] = 'False';
        } else {
          newRow[field.fieldKey] = '';
        }
      });
      setArrayData(prev => ({
        ...prev,
        [group.arrayFieldName]: [...rows, newRow]
      }));
    };

    const removeRow = (rowIndex: number) => {
      if (rows.length <= group.arrayMinRows) return;
      setArrayData(prev => ({
        ...prev,
        [group.arrayFieldName]: rows.filter((_, i) => i !== rowIndex)
      }));
    };

    const formatPhoneNumber = (input: string): string => {
      const digits = input.replace(/\D/g, '');
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {rows.length} / {group.arrayMaxRows} rows
          </span>
          {canAddRow && (
            <button
              type="button"
              onClick={addRow}
              className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </button>
          )}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {groupFields.map(field => (
                    <th key={field.id} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {field.name}
                      {(field.isRequired || field.conditionalRequiredFieldId) && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {groupFields.map(field => {
                      const value = row[field.fieldKey] ?? '';
                      const errorKey = `${group.arrayFieldName}[${rowIndex}].${field.fieldKey}`;
                      const error = errors[errorKey];

                      return (
                        <td key={field.id} className="px-4 py-3 whitespace-nowrap">
                          {field.fieldType === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={value === 'True'}
                              onChange={(e) => handleArrayFieldChange(rowIndex, field.fieldKey, e.target.checked ? 'True' : 'False')}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                            />
                          ) : field.fieldType === 'dropdown' ? (
                            <select
                              value={value}
                              onChange={(e) => handleArrayFieldChange(rowIndex, field.fieldKey, e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500`}
                            >
                              <option value="">Select an option...</option>
                              {(field.options || []).map((option: any, i: number) => {
                                const optValue = typeof option === 'string' ? option : option.value;
                                const optDisplay = typeof option === 'string' ? option : (
                                  field.dropdownDisplayMode === 'value_and_description'
                                    ? `${option.value} - ${option.description}`
                                    : option.description || option.value
                                );
                                return <option key={i} value={optValue}>{optDisplay}</option>;
                              })}
                            </select>
                          ) : field.fieldType === 'phone' ? (
                            <input
                              type="tel"
                              inputMode="tel"
                              value={value}
                              onChange={(e) => handleArrayFieldChange(rowIndex, field.fieldKey, formatPhoneNumber(e.target.value))}
                              placeholder="(555) 123-4567"
                              maxLength={14}
                              className={`w-full px-2 py-1.5 text-sm border rounded ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500`}
                            />
                          ) : (
                            <input
                              type={field.fieldType === 'number' ? 'number' : field.fieldType === 'email' ? 'email' : 'text'}
                              value={value}
                              onChange={(e) => handleArrayFieldChange(rowIndex, field.fieldKey, e.target.value)}
                              placeholder={field.placeholder || ''}
                              maxLength={field.maxLength || undefined}
                              className={`w-full px-2 py-1.5 text-sm border rounded ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500`}
                            />
                          )}
                          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canRemoveRow && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIndex)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!executionResults) return null;

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${executionResults.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center space-x-2">
            {executionResults.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-medium ${executionResults.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {executionResults.success ? 'Execution Successful' : 'Execution Failed'}
            </span>
          </div>
          {executionResults.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{executionResults.error}</p>
          )}
        </div>

        {executionResults.results.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Step Results</h4>
            {executionResults.results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.status === 'completed'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : result.status === 'skipped'
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {result.node || result.step || `Step ${index + 1}`}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      result.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                        : result.status === 'skipped'
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
                {result.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">{result.error}</p>
                )}
                {result.requestUrl && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Request URL {result.httpMethod && <span className="text-blue-600 dark:text-blue-400">({result.httpMethod})</span>}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">{result.requestUrl}</p>
                  </div>
                )}
                {result.requestBody && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
                      View Request Body
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(result.requestBody), null, 2);
                        } catch {
                          return result.requestBody;
                        }
                      })()}
                    </pre>
                  </details>
                )}
                {result.output && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
                      View Output
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(result.output, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {executionResults.contextData && (
          <details className="mt-4">
            <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
              View Full Context Data
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(executionResults.contextData, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  const modalTitle = title || buttonName;
  const hasArrayGroup = groups.some(g => g.isArrayGroup);

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col ${hasArrayGroup ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {modalTitle}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {confirmationPrompt ? 'User confirmation required' : userInputPrompt ? 'User input required' : exitData ? 'Flow Complete' : executionComplete ? 'Execution Results' : 'Enter parameters'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {confirmationPrompt ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-6">
                  <HelpCircle className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Confirmation Required
                </h4>
                <p className="text-gray-700 dark:text-gray-300 max-w-md mb-6 whitespace-pre-wrap">
                  {confirmationPrompt.promptMessage}
                </p>
                {confirmationPrompt.showLocationMap && confirmationPrompt.latitude && confirmationPrompt.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${confirmationPrompt.latitude},${confirmationPrompt.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full max-w-lg mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition-colors group relative"
                  >
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/static-map-proxy?center=${confirmationPrompt.latitude},${confirmationPrompt.longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${confirmationPrompt.latitude},${confirmationPrompt.longitude}`}
                      alt="Location Map"
                      className="w-full h-[200px] object-cover"
                      onError={(e) => {
                        const link = (e.target as HTMLElement).closest('a');
                        if (link) link.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 shadow-lg flex items-center gap-1.5">
                        <ExternalLink className="h-4 w-4" />
                        Open in Google Maps
                      </span>
                    </div>
                  </a>
                )}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleConfirmationResponse(false)}
                    disabled={isExecuting}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {confirmationPrompt.noButtonLabel}
                  </button>
                  <button
                    onClick={() => handleConfirmationResponse(true)}
                    disabled={isExecuting}
                    className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      confirmationPrompt.yesButtonLabel
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
              <button
                onClick={handleReset}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : userInputPrompt ? (
          <UserInputUI
            inputType={userInputPrompt.inputType}
            inputLabel={userInputPrompt.inputLabel}
            isExecuting={isExecuting}
            onSubmit={handleUserInputSubmit}
            onCancel={handleReset}
          />
        ) : exitData ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6">
                  <LogOut className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Flow Complete
                </h4>
                <p className="text-gray-700 dark:text-gray-300 max-w-md mb-8 whitespace-pre-wrap">
                  {exitData.exitMessage}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              {exitData.showRestartButton ? (
                <button
                  onClick={handleReset}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="flex items-center px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : executionComplete ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {renderResults()}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Run Again
              </button>
              <button
                onClick={onClose}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : groups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                This button has no parameter groups configured.
              </p>
            </div>
          </div>
        ) : (
          <>
            {totalSteps > 1 && (
              <div className="px-6 pt-4">
                <div className="flex items-center justify-center space-x-2">
                  {stepPath.map((stepGroups, index) => (
                    <div key={stepGroups.map(g => g.id).join('-')} className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                          index < currentStep
                            ? 'bg-green-500 text-white'
                            : index === currentStep
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                        title={stepGroups.map(g => g.name).join(' + ')}
                      >
                        {index < currentStep ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < stepPath.length - 1 && (
                        <div
                          className={`w-12 h-1 mx-1 rounded ${
                            index < currentStep
                              ? 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {currentStepGroups.length > 0 && (
                <div className="space-y-8">
                  {currentStepGroups.map((group, groupIndex) => {
                    const groupFields = fields.filter(f => f.groupId === group.id);
                    const nodeMapping = flowNodeMappings.find(m => m.groupId === group.id);
                    const headerContent = nodeMapping?.headerContent;
                    const resolvedHeader = headerContent ? resolveVariable(headerContent, contextData || {}) : null;

                    return (
                      <div key={group.id} className={groupIndex > 0 ? 'pt-6 border-t border-gray-200 dark:border-gray-700' : ''}>
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {group.name}
                          </h4>
                          {group.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {group.description}
                            </p>
                          )}
                        </div>

                        {resolvedHeader && (
                          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                              {resolvedHeader}
                            </p>
                          </div>
                        )}

                        {group.isArrayGroup && group.arrayFieldName ? (
                          renderArrayGroup(group)
                        ) : (
                          <div className="space-y-4">
                            {groupFields.map(field => renderField(field))}
                            {groupFields.length === 0 && (
                              <p className="text-gray-500 dark:text-gray-400 italic">
                                No fields in this group
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={isFirstStep ? onClose : handleBack}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {isFirstStep ? 'Cancel' : 'Back'}
              </button>

              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isLastStep ? 'Execute' : 'Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

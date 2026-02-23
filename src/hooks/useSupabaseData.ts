import { useState, useEffect, useRef } from 'react';
import type { ExtractionType, TransformationType, SftpConfig, SettingsConfig, ApiConfig, EmailMonitoringConfig, EmailProcessingRule, ProcessedEmail, User, ExtractionWorkflow, WorkflowStep, EmailPollingLog, SftpPollingLog, CompanyBranding } from '../types';
import {
  fetchApiConfig,
  updateApiConfig,
  fetchSftpConfig,
  updateSftpConfig,
  fetchSettingsConfig,
  updateSettingsConfig,
  fetchCompanyBranding,
  updateCompanyBranding,
  fetchEmailPollingLogs,
  fetchSftpPollingLogs,
  fetchProcessedEmails,
  fetchEmailConfig,
  updateEmailConfig,
  fetchEmailRules,
  updateEmailRules,
} from '../services';
import { supabase } from '../lib/supabase';

export function useSupabaseData() {
  const [extractionTypes, setExtractionTypes] = useState<ExtractionType[]>([]);
  const [transformationTypes, setTransformationTypes] = useState<TransformationType[]>([]);
  const [sftpConfig, setSftpConfig] = useState<SftpConfig>({
    host: '',
    port: 22,
    username: '',
    password: '',
    xmlPath: '/uploads/xml/',
    pdfPath: '/uploads/pdf/',
    jsonPath: '/uploads/json/'
  });
  const [settingsConfig, setSettingsConfig] = useState<SettingsConfig>({
    password: ''
  });
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    path: '',
    password: '',
    googleApiKey: '',
    orderDisplayFields: '',
    customOrderDisplayFields: []
  });
  const [emailConfig, setEmailConfig] = useState<EmailMonitoringConfig>({
    provider: 'office365',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    monitoredEmail: '',
    defaultSendFromEmail: '',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    gmailMonitoredLabel: 'INBOX',
    pollingInterval: 5,
    isEnabled: false,
    enableAutoDetect: false
  });
  const [emailRules, setEmailRules] = useState<EmailProcessingRule[]>([]);
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<ExtractionWorkflow[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [emailPollingLogs, setEmailPollingLogs] = useState<EmailPollingLog[]>([]);
  const [sftpPollingLogs, setSftpPollingLogs] = useState<SftpPollingLog[]>([]);
  const [companyBranding, setCompanyBranding] = useState<CompanyBranding>({
    id: '',
    companyName: '',
    logoUrl: '',
    showCompanyName: false
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[useSupabaseData] Current auth session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        role: session?.user?.role
      });

      const [extractionTypesData, transformationTypesData] = await Promise.all([
        fetchExtractionTypesLocal(),
        fetchTransformationTypesLocal()
      ]);
      setExtractionTypes(extractionTypesData);
      setTransformationTypes(transformationTypesData);

      const [sftpConfigData, settingsConfigData, apiConfigData, companyBrandingData] = await Promise.all([
        fetchSftpConfig(),
        fetchSettingsConfig(),
        fetchApiConfig(),
        fetchCompanyBranding()
      ]);
      setSftpConfig(sftpConfigData);
      setSettingsConfig(settingsConfigData);
      setApiConfig(apiConfigData);
      setCompanyBranding(companyBrandingData);

      const [emailConfigData, emailRulesData] = await Promise.all([
        fetchEmailConfig(),
        fetchEmailRules()
      ]);
      setEmailConfig(emailConfigData);
      setEmailRules(emailRulesData);

      const [workflowsData, workflowStepsData] = await Promise.all([
        fetchWorkflowsLocal(),
        fetchWorkflowStepsLocal()
      ]);
      setWorkflows(workflowsData);
      setWorkflowSteps(workflowStepsData);

      const usersData = await loadUsers();
      setUsers(usersData);

      const [processedEmailsData, emailPollingLogsData, sftpPollingLogsData] = await Promise.all([
        fetchProcessedEmails(),
        fetchEmailPollingLogs(),
        fetchSftpPollingLogs()
      ]);
      setProcessedEmails(processedEmailsData);
      setEmailPollingLogs(emailPollingLogsData);
      setSftpPollingLogs(sftpPollingLogsData);
    } catch (error) {
      console.error('[useSupabaseData] ERROR loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasLoadedRef = useRef(false);

  const loadBrandingOnly = async () => {
    try {
      const brandingData = await fetchCompanyBranding();
      setCompanyBranding(brandingData);
    } catch (error) {
      console.error('[useSupabaseData] ERROR loading branding pre-auth:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        hasLoadedRef.current = false;
        return;
      }

      if (event === 'INITIAL_SESSION' && !session) {
        loadBrandingOnly().finally(() => setLoading(false));
        return;
      }

      if (session && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchExtractionTypesLocal(): Promise<ExtractionType[]> {
    try {
      const { data, error } = await supabase
        .from('extraction_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        defaultInstructions: t.default_instructions || '',
        formatTemplate: t.format_template || '',
        filename: t.filename || '',
        formatType: t.format_type || 'JSON',
        jsonPath: t.json_path,
        fieldMappings: typeof t.field_mappings === 'string' ? JSON.parse(t.field_mappings) : (t.field_mappings || []),
        workflowId: t.workflow_id
      }));
    } catch (error) {
      console.error('Error fetching extraction types:', error);
      return [];
    }
  }

  async function fetchTransformationTypesLocal(): Promise<TransformationType[]> {
    try {
      const { data, error } = await supabase
        .from('transformation_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        defaultInstructions: t.default_instructions || '',
        formatTemplate: t.format_template || '',
        filename: t.filename || '',
        formatType: t.format_type || 'JSON',
        jsonPath: t.json_path,
        fieldMappings: typeof t.field_mappings === 'string' ? JSON.parse(t.field_mappings) : (t.field_mappings || []),
        workflowId: t.workflow_id
      }));
    } catch (error) {
      console.error('Error fetching transformation types:', error);
      return [];
    }
  }

  async function fetchWorkflowsLocal(): Promise<ExtractionWorkflow[]> {
    try {
      const { data, error } = await supabase
        .from('extraction_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(w => ({
        id: w.id,
        name: w.name,
        isActive: w.is_active,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      }));
    } catch (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }
  }

  async function fetchWorkflowStepsLocal(): Promise<WorkflowStep[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .order('step_order');
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        workflowId: s.workflow_id,
        stepName: s.step_name,
        stepType: s.step_type,
        stepOrder: s.step_order,
        configJson: s.config_json,
        isEnabled: s.is_enabled,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      return [];
    }
  }

  const loadUsers = async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        role: user.role,
        permissions: user.permissions ? JSON.parse(user.permissions) : {},
        preferredUploadMode: user.preferred_upload_mode,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const updateSftpPollingConfigs = async (configs: any[]): Promise<void> => {
    try {
      const { data: existingConfigs } = await supabase
        .from('sftp_polling_configs')
        .select('id');

      const existingIds = new Set((existingConfigs || []).map(c => c.id));
      const configsToUpdate = configs.filter(config => existingIds.has(config.id) && !config.id.startsWith('temp-'));
      const configsToInsert = configs.filter(config => !existingIds.has(config.id) || config.id.startsWith('temp-'));

      for (const config of configsToUpdate) {
        const { error } = await supabase
          .from('sftp_polling_configs')
          .update({
            name: config.name,
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            monitored_path: config.monitoredPath,
            processed_path: config.processedPath,
            is_enabled: config.isEnabled,
            default_extraction_type_id: config.defaultExtractionTypeId,
            processing_mode: config.processingMode || 'extraction',
            imaging_bucket_id: config.imagingBucketId || null,
            workflow_id: config.workflowId,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (error) throw error;
      }

      if (configsToInsert.length > 0) {
        const { error } = await supabase
          .from('sftp_polling_configs')
          .insert(
            configsToInsert.map(config => ({
              name: config.name,
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.password,
              monitored_path: config.monitoredPath,
              processed_path: config.processedPath,
              is_enabled: config.isEnabled,
              default_extraction_type_id: config.defaultExtractionTypeId,
              processing_mode: config.processingMode || 'extraction',
              imaging_bucket_id: config.imagingBucketId || null,
              workflow_id: config.workflowId
            }))
          );

        if (error) throw error;
      }

      const currentIds = configs.filter(config => !config.id.startsWith('temp-')).map(config => config.id);
      if (currentIds.length > 0) {
        const { error } = await supabase
          .from('sftp_polling_configs')
          .delete()
          .not('id', 'in', `(${currentIds.map(id => `'${id}'`).join(',')})`);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating SFTP polling configs:', error);
      throw error;
    }
  };

  const handleUpdateSftpConfig = async (config: SftpConfig): Promise<void> => {
    await updateSftpConfig(config);
    const updatedConfig = await fetchSftpConfig();
    setSftpConfig(updatedConfig);
  };

  const handleUpdateSettingsConfig = async (config: SettingsConfig): Promise<void> => {
    await updateSettingsConfig(config);
    const updatedConfig = await fetchSettingsConfig();
    setSettingsConfig(updatedConfig);
  };

  const handleUpdateApiConfig = async (config: ApiConfig): Promise<void> => {
    await updateApiConfig(config);
    const updatedConfig = await fetchApiConfig();
    setApiConfig(updatedConfig);
  };

  const handleUpdateEmailConfig = async (config: EmailMonitoringConfig): Promise<void> => {
    await updateEmailConfig(config);
    const updatedConfig = await fetchEmailConfig();
    setEmailConfig(updatedConfig);
  };

  const handleUpdateEmailRules = async (rules: EmailProcessingRule[]): Promise<void> => {
    await updateEmailRules(rules);
    const updatedRules = await fetchEmailRules();
    setEmailRules(updatedRules);
  };

  const handleUpdateCompanyBranding = async (branding: CompanyBranding): Promise<void> => {
    await updateCompanyBranding(branding);
    const updatedBranding = await fetchCompanyBranding();
    setCompanyBranding(updatedBranding);
  };

  const refreshCompanyBranding = async (): Promise<void> => {
    try {
      const updatedBranding = await fetchCompanyBranding();
      setCompanyBranding(updatedBranding);
    } catch (error) {
      console.error('Error refreshing company branding:', error);
      throw error;
    }
  };

  const refreshPollingLogs = async (): Promise<EmailPollingLog[]> => {
    try {
      const updatedLogs = await fetchEmailPollingLogs();
      setEmailPollingLogs(updatedLogs);
      return updatedLogs;
    } catch (error) {
      console.error('Error refreshing polling logs:', error);
      throw error;
    }
  };

  const refreshSftpPollingLogs = async (): Promise<SftpPollingLog[]> => {
    try {
      const updatedLogs = await fetchSftpPollingLogs();
      setSftpPollingLogs(updatedLogs);
      return updatedLogs;
    } catch (error) {
      console.error('Error refreshing SFTP polling logs:', error);
      throw error;
    }
  };

  const refreshProcessedEmails = async (): Promise<ProcessedEmail[]> => {
    try {
      const updatedEmails = await fetchProcessedEmails();
      setProcessedEmails(updatedEmails);
      return updatedEmails;
    } catch (error) {
      console.error('Error refreshing processed emails:', error);
      throw error;
    }
  };

  return {
    extractionTypes,
    transformationTypes,
    sftpConfig,
    settingsConfig,
    apiConfig,
    emailConfig,
    emailRules,
    processedEmails,
    users,
    workflows,
    workflowSteps,
    emailPollingLogs,
    sftpPollingLogs,
    companyBranding,
    loading,
    refreshData: loadData,
    updateSftpConfig: handleUpdateSftpConfig,
    updateSettingsConfig: handleUpdateSettingsConfig,
    updateApiConfig: handleUpdateApiConfig,
    updateEmailConfig: handleUpdateEmailConfig,
    updateEmailRules: handleUpdateEmailRules,
    updateSftpPollingConfigs,
    updateCompanyBranding: handleUpdateCompanyBranding,
    refreshPollingLogs,
    refreshSftpPollingLogs,
    refreshProcessedEmails,
    refreshCompanyBranding,
  };
}

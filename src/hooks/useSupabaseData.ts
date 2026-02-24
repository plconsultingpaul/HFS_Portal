import { useState, useEffect, useRef } from 'react';
import type { SftpConfig, SettingsConfig, ApiConfig, EmailMonitoringConfig, EmailProcessingRule, ProcessedEmail, User, EmailPollingLog, SftpPollingLog, CompanyBranding } from '../types';
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
    sftpConfig,
    settingsConfig,
    apiConfig,
    emailConfig,
    emailRules,
    processedEmails,
    users,
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

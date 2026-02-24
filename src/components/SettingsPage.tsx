import React, { useState } from 'react';
import { FileText, Server, Key, Mail, Filter, Settings as SettingsIcon, Users, Bell } from 'lucide-react';
import type { SftpConfig, SettingsConfig, ApiConfig, EmailMonitoringConfig, EmailProcessingRule, ProcessedEmail, User } from '../types';
import type { CompanyBranding } from '../types';

import SftpSettings from './settings/SftpSettings';
import ApiSettings from './settings/ApiSettings';
import EmailMonitoringSettings from './settings/EmailMonitoringSettings';
import EmailRulesSettings from './settings/EmailRulesSettings';
import ProcessedEmailsSettings from './settings/ProcessedEmailsSettings';
import UserManagementSettings from './settings/UserManagementSettings';
import { Building } from 'lucide-react';
import CompanyBrandingSettings from './settings/CompanyBrandingSettings';
import NotificationTemplatesSettings from './settings/NotificationTemplatesSettings';

interface SettingsPageProps {
  sftpConfig: SftpConfig;
  settingsConfig: SettingsConfig;
  apiConfig: ApiConfig;
  emailConfig: EmailMonitoringConfig;
  emailRules: EmailProcessingRule[];
  processedEmails: ProcessedEmail[];
  users: User[];
  currentUser: User;
  companyBranding: CompanyBranding;
  getAllUsers: () => Promise<User[]>;
  createUser: (username: string, password: string, isAdmin: boolean) => Promise<{ success: boolean; message: string }>;
  updateUser: (userId: string, updates: { isAdmin?: boolean; isActive?: boolean }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  onUpdateSftpConfig: (config: SftpConfig) => Promise<void>;
  onUpdateSettingsConfig: (config: SettingsConfig) => Promise<void>;
  onUpdateApiConfig: (config: ApiConfig) => Promise<void>;
  onUpdateEmailConfig: (config: EmailMonitoringConfig) => Promise<void>;
  onUpdateEmailRules: (rules: EmailProcessingRule[]) => Promise<void>;
  onUpdateSftpPollingConfigs: (configs: any[]) => Promise<void>;
  onUpdateCompanyBranding: (branding: CompanyBranding) => Promise<void>;
  refreshCompanyBranding?: () => Promise<void>;
}

type SettingsTab = 'sftp' | 'api' | 'email' | 'users' | 'branding' | 'notifications';

export default function SettingsPage({
  sftpConfig,
  settingsConfig,
  apiConfig,
  emailConfig,
  emailRules,
  processedEmails,
  users,
  currentUser,
  companyBranding,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserPassword,
  onUpdateSftpConfig,
  onUpdateSettingsConfig,
  onUpdateApiConfig,
  onUpdateEmailConfig,
  onUpdateEmailRules,
  onUpdateSftpPollingConfigs,
  onUpdateCompanyBranding,
  refreshCompanyBranding,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sftp');

  const tabs = [
    ...(currentUser.permissions.sftp ? [{ id: 'sftp' as SettingsTab, label: 'SFTP Settings', icon: Server, description: 'Configure file upload server' }] : []),
    ...(currentUser.permissions.api ? [{ id: 'api' as SettingsTab, label: 'API Settings', icon: Key, description: 'Configure API endpoints and keys' }] : []),
    ...(currentUser.permissions.emailMonitoring ? [{ id: 'email' as SettingsTab, label: 'Email Monitoring', icon: Mail, description: 'Configure email automation' }] : []),
    ...(currentUser.permissions.notificationTemplates || currentUser.isAdmin ? [{ id: 'notifications' as SettingsTab, label: 'Notification Templates', icon: Bell, description: 'Manage notification templates' }] : []),
    ...(currentUser.permissions.userManagement ? [{ id: 'users' as SettingsTab, label: 'User Management', icon: Users, description: 'Manage users and permissions' }] : []),
    ...(currentUser.permissions.companyBranding || currentUser.isAdmin ? [{ id: 'branding' as SettingsTab, label: 'Company Branding', icon: Building, description: 'Customize company branding' }] : [])
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sftp':
        return currentUser.permissions.sftp ? (
          <SftpSettings
            sftpConfig={sftpConfig}
            onUpdateSftpConfig={onUpdateSftpConfig}
            onUpdateSftpPollingConfigs={onUpdateSftpPollingConfigs}
            onRefreshSftpPollingLogs={async () => {
              console.log('Refreshing SFTP polling logs');
              return [];
            }}
            isAdmin={currentUser.isAdmin}
          />
        ) : <PermissionDenied />;
      case 'api':
        return currentUser.permissions.api ? (
          <ApiSettings
            apiConfig={apiConfig}
            onUpdateApiConfig={onUpdateApiConfig}
            isAdmin={currentUser.isAdmin}
          />
        ) : <PermissionDenied />;
      case 'email':
        return currentUser.permissions.emailMonitoring ? (
          <EmailMonitoringSettings
            emailConfig={emailConfig}
            emailRules={emailRules}
            onUpdateEmailConfig={onUpdateEmailConfig}
            onUpdateEmailRules={onUpdateEmailRules}
            isAdmin={currentUser.isAdmin}
          />
        ) : <PermissionDenied />;
      case 'users':
        return currentUser.permissions.userManagement ? (
          <UserManagementSettings
            currentUser={currentUser}
            getAllUsers={getAllUsers}
            createUser={createUser}
            updateUser={updateUser}
            deleteUser={deleteUser}
          />
        ) : <PermissionDenied />;
      case 'branding':
        return (currentUser.permissions.companyBranding || currentUser.isAdmin) ? (
          <CompanyBrandingSettings
            companyBranding={companyBranding}
            onUpdateCompanyBranding={onUpdateCompanyBranding}
            refreshCompanyBranding={refreshCompanyBranding}
            isAdmin={currentUser.isAdmin}
          />
        ) : <PermissionDenied />;
      case 'notifications':
        return (currentUser.permissions.notificationTemplates || currentUser.isAdmin) ? (
          <NotificationTemplatesSettings isAdmin={currentUser.isAdmin} />
        ) : <PermissionDenied />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-sm font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:ring-2 hover:ring-purple-400 dark:hover:ring-purple-500'
              }`}
            >
              <Icon className={`h-4 w-4 ${
                activeTab === tab.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[calc(100vh-14rem)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl border border-purple-100 dark:border-gray-700 p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}

function PermissionDenied() {
  return (
    <div className="text-center py-12">
      <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <SettingsIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
      <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this settings section.</p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Contact your administrator to request access.</p>
    </div>
  );
}

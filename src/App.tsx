import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import SettingsPage from './components/SettingsPage';
import LogsPage from './components/LogsPage';
import VendorSetupPage from './components/VendorSetupPage';
import CheckInSetupPage from './components/CheckInSetupPage';
import ClientSetupPage from './components/ClientSetupPage';
import OrderEntryPage from './components/OrderEntryPage';
import OrderEntrySubmissionsPage from './components/OrderEntrySubmissionsPage';
import OrderEntrySubmissionDetailPage from './components/OrderEntrySubmissionDetailPage';
import RateQuotePage from './components/RateQuotePage';
import AddressBookPage from './components/AddressBookPage';
import DriverCheckinPage from './components/DriverCheckinPage';
import PermissionDeniedModal from './components/common/PermissionDeniedModal';
import { useSupabaseData } from './hooks/useSupabaseData';
import { Loader2 } from 'lucide-react';
import type { SftpConfig, SettingsConfig, ApiConfig, EmailMonitoringConfig, EmailProcessingRule, CompanyBranding } from './types';

export default function App() {
  const [isDriverCheckin, setIsDriverCheckin] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
  }>({
    isOpen: false,
    message: ''
  });

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/driver-checkin' || path === '/checkin') {
      setIsDriverCheckin(true);
    }
  }, []);

  const {
    isAuthenticated,
    user,
    loading: authLoading,
    sessionExpiredMessage,
    login,
    logout,
    clearSessionExpiredMessage,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
  } = useAuth();
  const [currentPage, setCurrentPage] = useState<'vendor-setup' | 'checkin-setup' | 'client-setup' | 'settings' | 'logs' | 'order-entry' | 'order-submissions' | 'order-submission-detail' | 'rate-quote' | 'client-users' | 'address-book'>('client-setup');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const {
    sftpConfig,
    settingsConfig,
    apiConfig,
    emailConfig,
    emailRules,
    processedEmails,
    users,
    emailPollingLogs,
    sftpPollingLogs,
    loading,
    refreshData,
    companyBranding,
    refreshProcessedEmails,
    refreshSftpPollingLogs,
    updateSftpPollingConfigs,
    updateSftpConfig,
    updateSettingsConfig,
    updateApiConfig,
    updateEmailConfig,
    updateEmailRules,
    refreshPollingLogs,
    updateCompanyBranding,
  } = useSupabaseData();

  // Navigate to appropriate page when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      // Client users start on order-entry or rate-quote if they have access
      if (user.role === 'client') {
        if (user.hasOrderEntryAccess) {
          setCurrentPage('order-entry');
        } else if (user.hasRateQuoteAccess) {
          setCurrentPage('rate-quote');
        } else if (user.isClientAdmin) {
          setCurrentPage('client-users');
        }
      } else {
        setCurrentPage('client-setup');
      }
    }
  }, [isAuthenticated, user]);

  if (isDriverCheckin) {
    return <DriverCheckinPage />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="text-lg font-medium text-purple-600">
            {authLoading ? 'Checking authentication...' : 'Loading your data...'}
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <LoginPage
        companyBranding={companyBranding}
        onLogin={login}
        sessionExpiredMessage={sessionExpiredMessage}
        onClearSessionExpiredMessage={clearSessionExpiredMessage}
      />
    );
  }

  const handleNavigate = (page: 'vendor-setup' | 'checkin-setup' | 'client-setup' | 'settings' | 'logs' | 'order-entry' | 'order-submissions' | 'rate-quote' | 'client-users' | 'address-book') => {
    if (page === 'settings') {
      const settingsPermissions = {
        sftp: user.permissions.sftp,
        api: user.permissions.api,
        emailMonitoring: user.permissions.emailMonitoring,
        emailRules: user.permissions.emailRules,
        processedEmails: user.permissions.processedEmails,
        userManagement: user.permissions.userManagement
      };
      const hasAnyPermission = Object.values(settingsPermissions).some(permission => permission === true);

      if (!hasAnyPermission) {
        setPermissionDenied({
          isOpen: true,
          message: 'You do not have permission to access the Settings page. This section requires administrative privileges to configure system settings, manage users, or adjust integrations.',
          title: 'Settings Access Denied'
        });
        return;
      }
    }

    // Check for vendor-setup permission (requires userManagement)
    if (page === 'vendor-setup' && !user.permissions.userManagement) {
      setPermissionDenied({
        isOpen: true,
        message: 'You do not have permission to access Vendor Setup. This section requires user management privileges.',
        title: 'Vendor Setup Access Denied'
      });
      return;
    }

    // Check for checkin-setup permission (requires admin)
    if (page === 'checkin-setup' && !user.isAdmin) {
      setPermissionDenied({
        isOpen: true,
        message: 'You do not have permission to access Check-In Setup. This section requires administrator privileges.',
        title: 'Check-In Setup Access Denied'
      });
      return;
    }

    // Check for client-setup permission (requires userManagement)
    if (page === 'client-setup' && !user.permissions.userManagement) {
      setPermissionDenied({
        isOpen: true,
        message: 'You do not have permission to access Client Setup. This section requires user management privileges.',
        title: 'Client Setup Access Denied'
      });
      return;
    }

    // Check for order-entry permission (requires client role with access)
    if (page === 'order-entry') {
      if (user.role !== 'client' || !user.hasOrderEntryAccess) {
        setPermissionDenied({
          isOpen: true,
          message: 'You do not have permission to access Order Entry. This feature is only available to client users with appropriate access.',
          title: 'Order Entry Access Denied'
        });
        return;
      }
    }

    // Check for rate-quote permission (requires client role with access)
    if (page === 'rate-quote') {
      if (user.role !== 'client' || !user.hasRateQuoteAccess) {
        setPermissionDenied({
          isOpen: true,
          message: 'You do not have permission to access Rate Quote. This feature is only available to client users with appropriate access.',
          title: 'Rate Quote Access Denied'
        });
        return;
      }
    }

    // Check for address-book permission (requires client role with access or Client Admin)
    if (page === 'address-book') {
      if (user.role !== 'client' || (!user.hasAddressBookAccess && !user.isClientAdmin)) {
        setPermissionDenied({
          isOpen: true,
          message: 'You do not have permission to access Address Book. This feature is only available to client users with appropriate access.',
          title: 'Address Book Access Denied'
        });
        return;
      }
    }

    // Check for client-users permission (requires client admin)
    if (page === 'client-users') {
      if (user.role !== 'client' || !user.isClientAdmin) {
        setPermissionDenied({
          isOpen: true,
          message: 'You do not have permission to access User Management. This feature is only available to client administrators.',
          title: 'User Management Access Denied'
        });
        return;
      }
    }

    if ((page === 'logs' || page === 'settings' || page === 'vendor-setup' || page === 'checkin-setup' || page === 'client-setup') && user.role === 'vendor') {
      setPermissionDenied({
        isOpen: true,
        message: 'You do not have permission to access this section. Your account is configured with vendor-only access.',
        title: 'Access Denied'
      });
      return;
    }

    if ((page === 'logs' || page === 'settings' || page === 'vendor-setup' || page === 'checkin-setup' || page === 'client-setup') && user.role === 'client') {
      setPermissionDenied({
        isOpen: true,
        message: 'You do not have permission to access this section.',
        title: 'Access Denied'
      });
      return;
    }

    setCurrentPage(page);
  };

  const handleUpdateSftpConfig = async (config: SftpConfig) => {
    try {
      await updateSftpConfig(config);
    } catch (error) {
      console.error('Failed to update SFTP config:', error);
      alert('Failed to save SFTP configuration. Please try again.');
    }
  };

  const handleUpdateSettingsConfig = async (config: SettingsConfig) => {
    try {
      await updateSettingsConfig(config);
    } catch (error) {
      console.error('Failed to update settings config:', error);
      alert('Failed to save settings configuration. Please try again.');
    }
  };

  const handleUpdateApiConfig = async (config: ApiConfig) => {
    try {
      await updateApiConfig(config);
    } catch (error) {
      console.error('Failed to update API config:', error);
      alert('Failed to save API configuration. Please try again.');
    }
  };

  const handleUpdateEmailConfig = async (config: EmailMonitoringConfig) => {
    try {
      await updateEmailConfig(config);
    } catch (error) {
      console.error('Failed to update email config:', error);
      alert('Failed to save email configuration. Please try again.');
    }
  };

  const handleUpdateEmailRules = async (rules: EmailProcessingRule[]) => {
    try {
      await updateEmailRules(rules);
    } catch (error) {
      console.error('Failed to update email rules:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Detailed error:', errorMessage);
      throw new Error(`Failed to save email processing rules: ${errorMessage}`);
    }
  };

  const handleUpdateCompanyBranding = async (branding: CompanyBranding) => {
    try {
      await updateCompanyBranding(branding);
    } catch (error) {
      console.error('Failed to update company branding:', error);
      alert('Failed to save company branding. Please try again.');
    }
  };

  return (
    <>
      <PermissionDeniedModal
        isOpen={permissionDenied.isOpen}
        onClose={() => setPermissionDenied({ isOpen: false, message: '' })}
        message={permissionDenied.message}
        title={permissionDenied.title}
      />
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        companyBranding={companyBranding}
        onLogout={logout}
      >
        {currentPage === 'vendor-setup' && (
        <VendorSetupPage
          currentUser={user}
          apiConfig={apiConfig}
          getAllUsers={getAllUsers}
          createUser={createUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          updateUserPassword={updateUserPassword}
          onUpdateApiConfig={handleUpdateApiConfig}
        />
      )}
      {currentPage === 'checkin-setup' && (
        <CheckInSetupPage />
      )}
      {currentPage === 'client-setup' && (
        <ClientSetupPage
          currentUser={user}
          getAllUsers={getAllUsers}
          createUser={createUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          updateUserPassword={updateUserPassword}
        />
      )}
      {currentPage === 'order-entry' && (
        <OrderEntryPage currentUser={user} />
      )}
      {currentPage === 'order-submissions' && (
        <OrderEntrySubmissionsPage
          currentUser={user}
          onViewDetail={(id) => {
            setSelectedSubmissionId(id);
            setCurrentPage('order-submission-detail');
          }}
        />
      )}
      {currentPage === 'order-submission-detail' && selectedSubmissionId && (
        <OrderEntrySubmissionDetailPage
          currentUser={user}
          submissionId={selectedSubmissionId}
          onBack={() => setCurrentPage('order-submissions')}
        />
      )}
      {currentPage === 'rate-quote' && (
        <RateQuotePage />
      )}
      {currentPage === 'address-book' && (
        <AddressBookPage user={user} />
      )}
      {currentPage === 'client-users' && (
        <ClientSetupPage
          currentUser={user}
          getAllUsers={getAllUsers}
          createUser={createUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          updateUserPassword={updateUserPassword}
        />
      )}
      {currentPage === 'logs' && (
        <LogsPage
          emailPollingLogs={emailPollingLogs}
          sftpPollingLogs={sftpPollingLogs}
          processedEmails={processedEmails}
          isAdmin={user?.isAdmin}
          userPermissions={user?.permissions}
          onRefreshPollingLogs={refreshPollingLogs}
          onRefreshSftpPollingLogs={refreshSftpPollingLogs}
          onRefreshProcessedEmails={refreshProcessedEmails}
        />
      )}
      {currentPage === 'settings' && (
        <SettingsPage
          sftpConfig={sftpConfig}
          settingsConfig={settingsConfig}
          apiConfig={apiConfig}
          emailConfig={emailConfig}
          emailRules={emailRules}
          users={users}
          currentUser={user}
          companyBranding={companyBranding}
          processedEmails={processedEmails}
          getAllUsers={getAllUsers}
          createUser={createUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          updateUserPassword={updateUserPassword}
          onUpdateSftpConfig={handleUpdateSftpConfig}
          onUpdateSettingsConfig={handleUpdateSettingsConfig}
          onUpdateApiConfig={handleUpdateApiConfig}
          onUpdateEmailConfig={handleUpdateEmailConfig}
          onUpdateEmailRules={handleUpdateEmailRules}
          onUpdateSftpPollingConfigs={updateSftpPollingConfigs}
          onUpdateCompanyBranding={handleUpdateCompanyBranding}
        />
      )}
      </Layout>
    </>
  );
}
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useSupabaseData } from './hooks/useSupabaseData';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { LicenseProvider } from './contexts/LicenseContext';
import { Loader2 } from 'lucide-react';

import LoginPage from './components/LoginPage';
import ClientLoginPage from './components/ClientLoginPage';
import ClientLayout from './components/ClientLayout';
import ClientHelpPage from './components/ClientHelpPage';
import ClientUsersPage from './components/ClientUsersPage';
import DriverCheckinPage from './components/DriverCheckinPage';
import PasswordSetupPage from './components/PasswordSetupPage';
import PasswordResetPage from './components/PasswordResetPage';
import LayoutRouter from './components/LayoutRouter';
import PrivateRoute from './components/router/PrivateRoute';
import RoleBasedRoute from './components/router/RoleBasedRoute';
import NotFound from './components/router/NotFound';

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
import TrackTracePage from './components/TrackTracePage';
import ShipmentDetailsPage from './components/ShipmentDetailsPage';
import InvoicePage from './components/InvoicePage';
import HelpPage from './components/HelpPage';

import type { SftpConfig, SettingsConfig, ApiConfig, EmailMonitoringConfig, EmailProcessingRule } from './types';

function AppContent() {
  const {
    isAuthenticated,
    user,
    loading: authLoading,
    login,
    logout,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
    changeOwnPassword,
    getUserExtractionTypes,
    updateUserExtractionTypes,
    getUserTransformationTypes,
    updateUserTransformationTypes,
    getUserExecuteCategories,
    updateUserExecuteCategories,
  } = useAuth();

  const {
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

  const location = useLocation();

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="text-lg font-medium text-purple-600 dark:text-purple-400">
            {authLoading ? 'Checking authentication...' : 'Loading your data...'}
          </span>
        </div>
      </div>
    );
  }

  const publicPaths = ['/client/login', '/client', '/password-setup', '/reset-password', '/driver-checkin', '/checkin', '/help'];
  const isPublicPath = publicPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (!isAuthenticated || !user) {
    const handleAdminLogin = async (username: string, password: string) => {
      return login(username, password, 'admin');
    };

    if (isPublicPath) {
      return (
        <Routes>
          <Route path="/driver-checkin" element={<DriverCheckinPage />} />
          <Route path="/checkin" element={<DriverCheckinPage />} />
          <Route path="/password-setup" element={<PasswordSetupPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/client/login" element={
            <ClientPortalLogin
              companyBranding={companyBranding}
              onLogin={login}
              isAuthenticated={isAuthenticated}
              user={user}
            />
          } />
          <Route path="/client" element={
            <ClientPortalRedirect
              isAuthenticated={isAuthenticated}
              user={user}
            />
          } />
          <Route path="*" element={<Navigate to="/client/login" replace />} />
        </Routes>
      );
    }
    return <LoginPage companyBranding={companyBranding} onLogin={handleAdminLogin} />;
  }

  return (
    <Routes>
      <Route path="/driver-checkin" element={<DriverCheckinPage />} />
      <Route path="/checkin" element={<DriverCheckinPage />} />
      <Route path="/password-setup" element={<PasswordSetupPage />} />
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route path="/" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
            {user.role === 'client' ? (
              user.hasOrderEntryAccess ? (
                <Navigate to="/order-entry" replace />
              ) : user.hasRateQuoteAccess ? (
                <Navigate to="/rate-quote" replace />
              ) : user.isClientAdmin ? (
                <Navigate to="/client-users" replace />
              ) : (
                <Navigate to="/order-entry" replace />
              )
            ) : (
              <Navigate to="/client-setup" replace />
            )}
          </LayoutRouter>
        </PrivateRoute>
      } />

      <Route path="/vendor-setup" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requirePermission="userManagement"
            deniedTitle="Vendor Setup Access Denied"
            deniedMessage="You do not have permission to access Vendor Setup. This section requires user management privileges."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <VendorSetupPage
                currentUser={user}
                apiConfig={apiConfig}
                extractionTypes={extractionTypes}
                transformationTypes={transformationTypes}
                getAllUsers={getAllUsers}
                createUser={createUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
                updateUserPassword={updateUserPassword}
                onUpdateApiConfig={handleUpdateApiConfig}
              />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/checkin-setup" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            customCheck={(u) => u.isAdmin === true}
            deniedTitle="Check-In Setup Access Denied"
            deniedMessage="You do not have permission to access Check-In Setup. This section requires administrator privileges."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <CheckInSetupPage workflows={workflows} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/client-setup" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requirePermission="userManagement"
            deniedTitle="Client Setup Access Denied"
            deniedMessage="You do not have permission to access Client Setup. This section requires user management privileges."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <ClientSetupPage
                currentUser={user}
                extractionTypes={extractionTypes}
                transformationTypes={transformationTypes}
                getAllUsers={getAllUsers}
                createUser={createUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
                updateUserPassword={updateUserPassword}
              />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/order-entry" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="orderEntry"
            deniedTitle="Order Entry Access Denied"
            deniedMessage="You do not have permission to access Order Entry. This feature is only available to client users with appropriate access."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <OrderEntryPage currentUser={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/order-entry/submissions" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            customCheck={(u) => u.role === 'admin' || u.role === 'user'}
            deniedMessage="You do not have permission to access submissions."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <OrderEntrySubmissionsPage currentUser={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/order-entry/submissions/:id" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            customCheck={(u) => u.role === 'admin' || u.role === 'user'}
            deniedMessage="You do not have permission to view submission details."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <OrderEntrySubmissionDetailPage currentUser={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/rate-quote" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="rateQuote"
            deniedTitle="Rate Quote Access Denied"
            deniedMessage="You do not have permission to access Rate Quote. This feature is only available to client users with appropriate access."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <RateQuotePage />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/address-book" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="addressBook"
            deniedTitle="Address Book Access Denied"
            deniedMessage="You do not have permission to access Address Book. This feature is only available to client users with appropriate access."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <AddressBookPage user={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/track-trace" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="trackTrace"
            deniedTitle="Track & Trace Access Denied"
            deniedMessage="You do not have permission to access Track & Trace. This feature is only available to client users with appropriate access."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <TrackTracePage currentUser={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/shipment/:orderId" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="trackTrace"
            deniedTitle="Shipment Details Access Denied"
            deniedMessage="You do not have permission to access shipment details."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <ShipmentDetailsPage currentUser={user} />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/invoices" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="invoice"
            deniedTitle="Invoice Access Denied"
            deniedMessage="You do not have permission to access Invoices. This feature is only available to client users with appropriate access."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <InvoicePage />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/client-users" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            requireClientAccess="clientAdmin"
            deniedTitle="User Management Access Denied"
            deniedMessage="You do not have permission to access User Management. This feature is only available to client administrators."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <ClientSetupPage
                currentUser={user}
                extractionTypes={extractionTypes}
                transformationTypes={transformationTypes}
                getAllUsers={getAllUsers}
                createUser={createUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
                updateUserPassword={updateUserPassword}
              />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/logs" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            customCheck={(u) => u.role === 'admin' || u.role === 'user'}
            deniedMessage="You do not have permission to access logs."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <LogsPage
                users={users}
                emailPollingLogs={emailPollingLogs}
                sftpPollingLogs={sftpPollingLogs}
                processedEmails={processedEmails}
                isAdmin={user?.isAdmin}
                userPermissions={user?.permissions}
                onRefreshPollingLogs={refreshPollingLogs}
                onRefreshSftpPollingLogs={refreshSftpPollingLogs}
                onRefreshProcessedEmails={refreshProcessedEmails}
              />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute isAuthenticated={isAuthenticated} user={user}>
          <RoleBasedRoute
            user={user}
            customCheck={(u) => {
              const settingsPermissions = {
                sftp: u.permissions.sftp,
                api: u.permissions.api,
                emailMonitoring: u.permissions.emailMonitoring,
                emailRules: u.permissions.emailRules,
                processedEmails: u.permissions.processedEmails,
                userManagement: u.permissions.userManagement
              };
              return Object.values(settingsPermissions).some(permission => permission === true);
            }}
            deniedTitle="Settings Access Denied"
            deniedMessage="You do not have permission to access the Settings page. This section requires administrative privileges to configure system settings, manage users, or adjust integrations."
          >
            <LayoutRouter user={user} companyBranding={companyBranding} onLogout={logout} onChangePassword={changeOwnPassword}>
              <SettingsPage
                extractionTypes={extractionTypes}
                sftpConfig={sftpConfig}
                settingsConfig={settingsConfig}
                apiConfig={apiConfig}
                emailConfig={emailConfig}
                emailRules={emailRules}
                users={users}
                currentUser={user}
                workflows={workflows}
                workflowSteps={workflowSteps}
                companyBranding={companyBranding}
                processedEmails={processedEmails}
                getAllUsers={getAllUsers}
                createUser={createUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
                updateUserPassword={updateUserPassword}
                getUserExtractionTypes={getUserExtractionTypes}
                updateUserExtractionTypes={updateUserExtractionTypes}
                getUserTransformationTypes={getUserTransformationTypes}
                updateUserTransformationTypes={updateUserTransformationTypes}
                getUserExecuteCategories={getUserExecuteCategories}
                updateUserExecuteCategories={updateUserExecuteCategories}
                onUpdateExtractionTypes={handleUpdateExtractionTypes}
                onDeleteExtractionType={handleDeleteExtractionType}
                onUpdateTransformationTypes={handleUpdateTransformationTypes}
                onDeleteTransformationType={handleDeleteTransformationType}
                onUpdateSftpConfig={handleUpdateSftpConfig}
                onUpdateSettingsConfig={handleUpdateSettingsConfig}
                onUpdateApiConfig={handleUpdateApiConfig}
                onUpdateEmailConfig={handleUpdateEmailConfig}
                onUpdateEmailRules={handleUpdateEmailRules}
                onUpdateSftpPollingConfigs={updateSftpPollingConfigs}
                onUpdateCompanyBranding={updateCompanyBranding}
              />
            </LayoutRouter>
          </RoleBasedRoute>
        </PrivateRoute>
      } />

      <Route path="/help" element={<HelpPage />} />

      <Route path="/client/login" element={
        <ClientPortalLogin
          companyBranding={companyBranding}
          onLogin={login}
          isAuthenticated={isAuthenticated}
          user={user}
        />
      } />

      <Route path="/client" element={
        <ClientPortalRedirect
          isAuthenticated={isAuthenticated}
          user={user}
        />
      } />

      <Route path="/client/track-trace" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="track-trace"
          requiredAccess="trackTrace"
        >
          <TrackTracePage currentUser={user} />
        </ClientPortalRoute>
      } />

      <Route path="/client/shipment/:orderId" element={
        <>
          {console.log('[AppRouter] /client/shipment/:orderId route matched!')}
          <ClientPortalRoute
            isAuthenticated={isAuthenticated}
            user={user}
            companyBranding={companyBranding}
            onLogout={logout}
            onChangePassword={changeOwnPassword}
            currentPage="shipment-details"
            requiredAccess="trackTrace"
          >
            <ShipmentDetailsPage currentUser={user} />
          </ClientPortalRoute>
        </>
      } />

      <Route path="/client/order-entry" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="order-entry"
          requiredAccess="orderEntry"
        >
          <OrderEntryPage currentUser={user!} />
        </ClientPortalRoute>
      } />

      <Route path="/client/rate-quotes" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="rate-quote"
          requiredAccess="rateQuote"
        >
          <RateQuotePage />
        </ClientPortalRoute>
      } />

      <Route path="/client/invoices" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="invoices"
          requiredAccess="invoice"
        >
          <InvoicePage />
        </ClientPortalRoute>
      } />

      <Route path="/client/address-book" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="address-book"
          requiredAccess="addressBook"
        >
          <AddressBookPage user={user!} />
        </ClientPortalRoute>
      } />

      <Route path="/client/users" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="users"
          requiredAccess="clientAdmin"
        >
          <ClientUsersPage
            currentUser={user!}
            getAllUsers={getAllUsers}
            createUser={createUser}
            updateUser={updateUser}
            deleteUser={deleteUser}
            updateUserPassword={updateUserPassword}
          />
        </ClientPortalRoute>
      } />

      <Route path="/client/help" element={
        <ClientPortalRoute
          isAuthenticated={isAuthenticated}
          user={user}
          companyBranding={companyBranding}
          onLogout={logout}
          onChangePassword={changeOwnPassword}
          currentPage="help"
        >
          <ClientHelpPage />
        </ClientPortalRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

interface ClientPortalLoginProps {
  companyBranding?: any;
  onLogin: (username: string, password: string, loginType?: 'admin' | 'client') => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  user: any;
}

function ClientPortalLogin({ companyBranding, onLogin, isAuthenticated, user }: ClientPortalLoginProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'client') {
        const defaultPage = getClientDefaultPage(user);
        navigate(`/client/${defaultPage}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleClientLogin = async (username: string, password: string) => {
    const result = await onLogin(username, password, 'client');
    return {
      ...result,
      isClientUser: result.success
    };
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <ClientLoginPage companyBranding={companyBranding} onLogin={handleClientLogin} />;
}

interface ClientPortalRedirectProps {
  isAuthenticated: boolean;
  user: any;
}

function ClientPortalRedirect({ isAuthenticated, user }: ClientPortalRedirectProps) {
  if (!isAuthenticated || !user) {
    return <Navigate to="/client/login" replace />;
  }

  if (user.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  const defaultPage = getClientDefaultPage(user);
  return <Navigate to={`/client/${defaultPage}`} replace />;
}

function getClientDefaultPage(user: any): string {
  if (user.hasTrackTraceAccess) return 'track-trace';
  if (user.hasOrderEntryAccess) return 'order-entry';
  if (user.hasRateQuoteAccess) return 'rate-quotes';
  if (user.hasInvoiceAccess) return 'invoices';
  if (user.hasAddressBookAccess || user.isClientAdmin) return 'address-book';
  if (user.isClientAdmin) return 'users';
  return 'help';
}

interface ClientPortalRouteProps {
  isAuthenticated: boolean;
  user: any;
  companyBranding?: any;
  onLogout: () => void;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  currentPage: 'order-entry' | 'rate-quote' | 'address-book' | 'track-trace' | 'invoices' | 'users' | 'help';
  requiredAccess?: 'orderEntry' | 'rateQuote' | 'addressBook' | 'trackTrace' | 'invoice' | 'clientAdmin';
  children: React.ReactNode;
}

function ClientPortalRoute({
  isAuthenticated,
  user,
  companyBranding,
  onLogout,
  onChangePassword,
  currentPage,
  requiredAccess,
  children
}: ClientPortalRouteProps) {
  const navigate = useNavigate();

  console.log(`[ClientPortalRoute] Rendering ${currentPage} - user object:`, {
    id: user?.id,
    username: user?.username,
    clientId: user?.clientId,
    role: user?.role,
    hasTrackTraceAccess: user?.hasTrackTraceAccess
  });

  if (!isAuthenticated || !user) {
    return <Navigate to="/client/login" replace />;
  }

  if (user.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  if (requiredAccess) {
    let hasAccess = false;
    switch (requiredAccess) {
      case 'orderEntry':
        hasAccess = user.hasOrderEntryAccess === true;
        break;
      case 'rateQuote':
        hasAccess = user.hasRateQuoteAccess === true;
        break;
      case 'addressBook':
        hasAccess = user.hasAddressBookAccess === true || user.isClientAdmin === true;
        break;
      case 'trackTrace':
        hasAccess = user.hasTrackTraceAccess === true;
        break;
      case 'invoice':
        hasAccess = user.hasInvoiceAccess === true;
        break;
      case 'clientAdmin':
        hasAccess = user.isClientAdmin === true;
        break;
    }

    if (!hasAccess) {
      const defaultPage = getClientDefaultPage(user);
      return <Navigate to={`/client/${defaultPage}`} replace />;
    }
  }

  const handleNavigate = (page: 'order-entry' | 'rate-quote' | 'address-book' | 'track-trace' | 'invoices' | 'users' | 'help') => {
    const routeMap: Record<string, string> = {
      'order-entry': '/client/order-entry',
      'rate-quote': '/client/rate-quotes',
      'address-book': '/client/address-book',
      'track-trace': '/client/track-trace',
      'invoices': '/client/invoices',
      'users': '/client/users',
      'help': '/client/help'
    };
    navigate(routeMap[page] || '/client/help');
  };

  const handleClientLogout = () => {
    onLogout();
    navigate('/client/login');
  };

  return (
    <ClientLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      user={user}
      companyBranding={companyBranding}
      onLogout={handleClientLogout}
      onChangePassword={onChangePassword}
    >
      {children}
    </ClientLayout>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <LicenseProvider>
          <AppContent />
        </LicenseProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

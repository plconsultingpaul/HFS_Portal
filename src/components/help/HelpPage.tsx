import React from 'react';
import { FileText } from 'lucide-react';
import GettingStartedSection from './sections/GettingStartedSection';
import SettingsOverviewSection from './sections/SettingsOverviewSection';
import EmailMonitoringSection from './sections/EmailMonitoringSection';
import UserManagementSection from './sections/UserManagementSection';
import BestPracticesSection from './sections/BestPracticesSection';
import TroubleshootingSection from './sections/TroubleshootingSection';
import ToolsSection from './sections/ToolsSection';
import ApiConfigurationSection from './sections/ApiConfigurationSection';
import SupportSection from './sections/SupportSection';

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete guide to managing your Client & Vendor Portal
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <GettingStartedSection />
        <SettingsOverviewSection />
        <EmailMonitoringSection />
        <UserManagementSection />
        <BestPracticesSection />
        <TroubleshootingSection />
        <ToolsSection />
        <ApiConfigurationSection />
        <SupportSection />
      </div>
    </div>
  );
}

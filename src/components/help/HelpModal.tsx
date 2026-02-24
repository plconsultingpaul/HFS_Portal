import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import GettingStartedSection from './sections/GettingStartedSection';
import SettingsOverviewSection from './sections/SettingsOverviewSection';
import EmailMonitoringSection from './sections/EmailMonitoringSection';
import UserManagementSection from './sections/UserManagementSection';
import TroubleshootingSection from './sections/TroubleshootingSection';
import BestPracticesSection from './sections/BestPracticesSection';
import ToolsSection from './sections/ToolsSection';
import ApiConfigurationSection from './sections/ApiConfigurationSection';
import SupportSection from './sections/SupportSection';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Help Center</h2>
            <p className="text-blue-100 mt-1">Complete guide to managing your Client & Vendor Portal</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-white/10 flex-shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            <GettingStartedSection />
            <SettingsOverviewSection />
            <EmailMonitoringSection />
            <UserManagementSection />
            <TroubleshootingSection />
            <BestPracticesSection />
            <ToolsSection />
            <ApiConfigurationSection />
            <SupportSection />
          </div>
        </div>
      </div>
    </div>
  );
}

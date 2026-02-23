import React, { useState } from 'react';
import { FileText, Settings, Inbox } from 'lucide-react';
import ImagingDocumentsTab from './imaging/ImagingDocumentsTab';
import ImagingSettingsTab from './imaging/ImagingSettingsTab';
import ImagingUnindexedTab from './imaging/ImagingUnindexedTab';

type ImagingTab = 'documents' | 'unindexed' | 'settings';

interface ImagingPageProps {
  isAdmin?: boolean;
}

export default function ImagingPage({ isAdmin = false }: ImagingPageProps) {
  const [activeTab, setActiveTab] = useState<ImagingTab>('documents');

  const tabs = [
    { id: 'documents' as ImagingTab, label: 'Documents', icon: FileText },
    { id: 'unindexed' as ImagingTab, label: 'Unindexed Queue', icon: Inbox },
    { id: 'settings' as ImagingTab, label: 'Settings', icon: Settings },
  ];

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
                  ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className={`h-4 w-4 ${
                activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'documents' && <ImagingDocumentsTab isAdmin={isAdmin} />}
        {activeTab === 'unindexed' && <ImagingUnindexedTab isAdmin={isAdmin} />}
        {activeTab === 'settings' && <ImagingSettingsTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

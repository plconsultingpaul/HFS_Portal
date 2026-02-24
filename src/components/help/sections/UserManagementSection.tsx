import React from 'react';
import { Users } from 'lucide-react';
import SectionCard from '../shared/SectionCard';
import SectionHeader from '../shared/SectionHeader';

export default function UserManagementSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={Users}
        title="User Management & Permissions"
        iconBgColor="bg-pink-100"
        iconColor="text-pink-600"
      />
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-pink-800 mb-4">User Types:</h3>
            <ul className="text-pink-700 space-y-2">
              <li>- <strong>Administrator:</strong> Full access to all settings and features</li>
              <li>- <strong>Regular User:</strong> Access to assigned features based on permissions</li>
              <li>- <strong>Vendor:</strong> Access to vendor-specific upload and configuration features</li>
              <li>- <strong>Client:</strong> Access to client portal features like order entry and tracking</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-pink-800 mb-4">Permission Categories:</h3>
            <ul className="text-pink-700 space-y-2">
              <li>- Client Setup, Vendor Setup, Check-In Setup</li>
              <li>- SFTP, API Settings</li>
              <li>- Email Monitoring, Rules, Processed Emails</li>
              <li>- User Management</li>
            </ul>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

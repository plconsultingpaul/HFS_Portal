import React from 'react';
import { FileText } from 'lucide-react';
import SectionCard from '../shared/SectionCard';
import SectionHeader from '../shared/SectionHeader';

export default function GettingStartedSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={FileText}
        title="Getting Started"
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
      />
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-800 mb-3">Welcome to the Portal</h3>
        <p className="text-green-700 mb-4">
          This portal provides a centralized platform for managing client and vendor operations, including order entry, shipment tracking,
          driver check-in, and email-based document processing. Use the sidebar navigation to access different features based on your permissions.
        </p>
        <h3 className="font-semibold text-green-800 mb-3">Key Features</h3>
        <ul className="text-green-700 space-y-2">
          <li>- <strong>Client Setup:</strong> Manage client accounts, users, and address books</li>
          <li>- <strong>Vendor Setup:</strong> Configure vendor settings and upload rules</li>
          <li>- <strong>Order Entry:</strong> Submit and track orders using configurable templates</li>
          <li>- <strong>Track & Trace:</strong> Monitor shipment status with real-time tracking</li>
          <li>- <strong>Driver Check-In:</strong> Streamline driver arrival and departure workflows</li>
        </ul>
      </div>
    </SectionCard>
  );
}

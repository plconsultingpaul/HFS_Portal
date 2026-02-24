import React from 'react';
import { Copy } from 'lucide-react';
import SectionCard from '../shared/SectionCard';
import SectionHeader from '../shared/SectionHeader';

export default function ToolsSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={Copy}
        title="Tools & Features"
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-3">Order Entry</h3>
          <p className="text-blue-700 mb-4">
            Submit orders using configurable templates with field validation and address lookup.
          </p>
          <ul className="text-blue-700 space-y-2">
            <li>- Fill in required fields and submit to API</li>
            <li>- Attach PDF documents to orders</li>
            <li>- Review submission history and status</li>
          </ul>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="font-semibold text-indigo-800 mb-3">Track & Trace</h3>
          <p className="text-indigo-700 mb-4">
            Monitor shipment status with real-time tracking, filtering, and detailed views.
          </p>
          <ul className="text-indigo-700 space-y-2">
            <li>- Search and filter shipments by multiple criteria</li>
            <li>- View shipment details and timeline</li>
            <li>- Access related documents and invoices</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

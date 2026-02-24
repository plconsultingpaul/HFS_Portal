import React from 'react';
import { CheckCircle } from 'lucide-react';
import SectionCard from '../shared/SectionCard';
import SectionHeader from '../shared/SectionHeader';

export default function BestPracticesSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={CheckCircle}
        title="Best Practices"
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
      />
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-green-800 mb-4">Configuration Tips:</h3>
            <ul className="text-green-700 space-y-2">
              <li>- Use clear, descriptive names for all configurations</li>
              <li>- Test API connections before going live</li>
              <li>- Set appropriate polling intervals for email monitoring (5-15 minutes recommended)</li>
              <li>- Review logs regularly to catch issues early</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-green-800 mb-4">Order Entry Tips:</h3>
            <ul className="text-green-700 space-y-2">
              <li>- Verify required fields are filled before submission</li>
              <li>- Use address book entries for frequently used addresses</li>
              <li>- Review order details in the submissions page after sending</li>
              <li>- Configure templates to match your workflow needs</li>
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold text-green-800 mb-4">Security & Performance:</h3>
          <ul className="text-green-700 space-y-2">
            <li>- Use strong passwords for SFTP and API authentication</li>
            <li>- Review logs regularly for errors or issues</li>
            <li>- Monitor API rate limits and usage</li>
            <li>- Grant users only the permissions they need</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

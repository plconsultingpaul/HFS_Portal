import React from 'react';
import { AlertCircle } from 'lucide-react';
import SectionCard from '../shared/SectionCard';
import SectionHeader from '../shared/SectionHeader';

export default function TroubleshootingSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={AlertCircle}
        title="Troubleshooting"
        iconBgColor="bg-red-100"
        iconColor="text-red-600"
      />
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-800 mb-4">Common Issues & Solutions</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-red-800 mb-2">SFTP Upload Fails:</h4>
            <ul className="text-red-700 space-y-2 ml-4">
              <li>- Test your SFTP connection in SFTP Settings</li>
              <li>- Verify server credentials and paths are correct</li>
              <li>- Check that the remote directories exist and are writable</li>
              <li>- Ensure firewall allows connections on the specified port</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-800 mb-2">API Calls Fail:</h4>
            <ul className="text-red-700 space-y-2 ml-4">
              <li>- Test your API connection using the test button in settings</li>
              <li>- Verify the API endpoint URL and authentication token</li>
              <li>- Check that request data matches the API's expected format</li>
              <li>- Review error details in the logs</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-800 mb-2">Email Monitoring Issues:</h4>
            <ul className="text-red-700 space-y-2 ml-4">
              <li>- Test your email connection before enabling monitoring</li>
              <li>- Ensure your app has proper permissions (Mail.Read for Office 365)</li>
              <li>- Check that processing rules are enabled and properly configured</li>
              <li>- Verify the monitored email address is correct</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-800 mb-2">Order Entry Issues:</h4>
            <ul className="text-red-700 space-y-2 ml-4">
              <li>- Ensure all required fields are filled before submission</li>
              <li>- Check API connection if submissions fail to send</li>
              <li>- Verify template configuration matches your API requirements</li>
              <li>- Review the submission details page for error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

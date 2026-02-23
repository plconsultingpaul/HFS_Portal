/*
  # Add Granular Permission Flags to User Permissions

  1. Changes
    - Updates all existing user `permissions` JSON column to include new granular permission flags
    - Admin users (is_admin = true) get all new permissions set to true
    - Non-admin users get new permissions derived from their existing coarser permissions:
      - `ordersConfiguration` from `vendorSetup`
      - `clientManagement`, `clientUserManagement`, `orderEntry`, `submissions`, `trackTrace` from `clientSetup`
      - `driverCheckin`, `driverManagement` from `checkinSetup`
      - `workflowLogs`, `emailPolling`, `sftpPolling` from `extractionLogs`
      - `checkinLogs` from `checkinSetup`
      - `notificationTemplates` from `emailMonitoring`
      - `companyBranding` from `userManagement`

  2. New Permission Keys
    - `ordersConfiguration` - Access to orders configuration in Vendor Setup
    - `clientManagement` - Manage client companies
    - `clientUserManagement` - Manage client users
    - `orderEntry` - Order entry configuration
    - `submissions` - View order submissions
    - `trackTrace` - Track & Trace configuration
    - `driverCheckin` - Configure driver check-in system
    - `driverManagement` - Manage driver information
    - `workflowLogs` - View workflow execution logs
    - `emailPolling` - View email polling logs
    - `sftpPolling` - View SFTP polling logs
    - `checkinLogs` - View check-in logs
    - `notificationTemplates` - Manage notification templates
    - `companyBranding` - Customize company branding

  3. Important Notes
    - This migration preserves all existing permission values
    - New permissions are only added if they don't already exist in the JSON
    - Admin users automatically get all new permissions enabled
*/

UPDATE users
SET permissions = jsonb_build_object(
  'extractPage', COALESCE((permissions::jsonb->>'extractPage')::boolean, is_admin),
  'extractionTypes', COALESCE((permissions::jsonb->>'extractionTypes')::boolean, is_admin),
  'transformPage', COALESCE((permissions::jsonb->>'transformPage')::boolean, is_admin),
  'transformationTypes', COALESCE((permissions::jsonb->>'transformationTypes')::boolean, is_admin),
  'executePage', COALESCE((permissions::jsonb->>'executePage')::boolean, is_admin),
  'executeSetup', COALESCE((permissions::jsonb->>'executeSetup')::boolean, is_admin),
  'sftp', COALESCE((permissions::jsonb->>'sftp')::boolean, is_admin),
  'api', COALESCE((permissions::jsonb->>'api')::boolean, is_admin),
  'emailMonitoring', COALESCE((permissions::jsonb->>'emailMonitoring')::boolean, is_admin),
  'emailRules', COALESCE((permissions::jsonb->>'emailRules')::boolean, is_admin),
  'processedEmails', COALESCE((permissions::jsonb->>'processedEmails')::boolean, is_admin),
  'extractionLogs', COALESCE((permissions::jsonb->>'extractionLogs')::boolean, is_admin),
  'userManagement', COALESCE((permissions::jsonb->>'userManagement')::boolean, is_admin),
  'workflowManagement', COALESCE((permissions::jsonb->>'workflowManagement')::boolean, is_admin),
  'vendorSetup', COALESCE((permissions::jsonb->>'vendorSetup')::boolean, is_admin),
  'clientSetup', COALESCE((permissions::jsonb->>'clientSetup')::boolean, is_admin),
  'checkinSetup', COALESCE((permissions::jsonb->>'checkinSetup')::boolean, is_admin),
  'ordersConfiguration', COALESCE(
    (permissions::jsonb->>'ordersConfiguration')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'vendorSetup')::boolean, false) END
  ),
  'clientManagement', COALESCE(
    (permissions::jsonb->>'clientManagement')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'clientSetup')::boolean, false) END
  ),
  'clientUserManagement', COALESCE(
    (permissions::jsonb->>'clientUserManagement')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'clientSetup')::boolean, false) END
  ),
  'orderEntry', COALESCE(
    (permissions::jsonb->>'orderEntry')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'clientSetup')::boolean, false) END
  ),
  'submissions', COALESCE(
    (permissions::jsonb->>'submissions')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'clientSetup')::boolean, false) END
  ),
  'trackTrace', COALESCE(
    (permissions::jsonb->>'trackTrace')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'clientSetup')::boolean, false) END
  ),
  'driverCheckin', COALESCE(
    (permissions::jsonb->>'driverCheckin')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'checkinSetup')::boolean, false) END
  ),
  'driverManagement', COALESCE(
    (permissions::jsonb->>'driverManagement')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'checkinSetup')::boolean, false) END
  ),
  'workflowLogs', COALESCE(
    (permissions::jsonb->>'workflowLogs')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'extractionLogs')::boolean, false) END
  ),
  'emailPolling', COALESCE(
    (permissions::jsonb->>'emailPolling')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'extractionLogs')::boolean, false) END
  ),
  'sftpPolling', COALESCE(
    (permissions::jsonb->>'sftpPolling')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'extractionLogs')::boolean, false) END
  ),
  'checkinLogs', COALESCE(
    (permissions::jsonb->>'checkinLogs')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'checkinSetup')::boolean, false) END
  ),
  'notificationTemplates', COALESCE(
    (permissions::jsonb->>'notificationTemplates')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'emailMonitoring')::boolean, false) END
  ),
  'companyBranding', COALESCE(
    (permissions::jsonb->>'companyBranding')::boolean,
    CASE WHEN is_admin THEN true ELSE COALESCE((permissions::jsonb->>'userManagement')::boolean, false) END
  )
)::text
WHERE permissions IS NOT NULL;
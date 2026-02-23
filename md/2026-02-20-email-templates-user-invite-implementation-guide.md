# Email Templates & User Invitation System - Implementation Guide

This document describes the complete email template and user invitation system used in Parse-It. Use this as a blueprint to implement the same functionality in another application built on Supabase + React.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Edge Functions (Server-Side)](#edge-functions-server-side)
4. [Frontend Components](#frontend-components)
5. [Complete Flow Diagrams](#complete-flow-diagrams)
6. [Implementation Steps](#implementation-steps)

---

## System Overview

The system has four interconnected features:

1. **User Creation** -- Admins create user accounts (username + email, no password). A Supabase Auth user is created with a random temporary password.
2. **Send Invite** -- Admins click "Send Invite" to email the user a secure one-time link to set their password.
3. **Password Setup** -- New users click the link in the email, land on a `/password-setup` page, and set their password.
4. **Forgot Credentials** -- Existing users who forget their username or password can self-service recover via email.

### Key Design Decisions

- Users log in with **username + password** (not email). A server-side `lookup_email_by_username` function resolves usernames to emails for Supabase Auth.
- The `users` table in `public` schema mirrors `auth.users` with the **same UUID** as primary key. This allows RLS policies to use `auth.uid()`.
- Email is sent via **Office 365 Graph API** or **Gmail API** using credentials stored in `email_monitoring_config`. The system does NOT use Supabase's built-in email (no magic links, no Supabase email confirmations).
- Template HTML is stored in the database and is editable by admins via a UI. Variables use `{{variable_name}}` syntax.
- Two template "types" exist: `admin` and `client` (for multi-tenant portal scenarios).

---

## Database Schema

### 1. `users` Table (core user profile)

This table mirrors `auth.users`. The `id` column must match the `auth.users.id` UUID.

```sql
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,  -- Same UUID as auth.users.id
  username text UNIQUE NOT NULL,
  email text,
  name text,
  password_hash text,  -- Legacy, nullable after auth migration
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT 'user',  -- 'admin', 'user', 'vendor', 'client'
  permissions jsonb DEFAULT '{}',
  preferred_upload_mode text DEFAULT 'manual',
  current_zone text,
  client_id uuid,
  is_client_admin boolean DEFAULT false,
  -- Invitation tracking
  invitation_sent_at timestamptz,
  invitation_sent_count integer DEFAULT 0,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### 2. `invitation_email_templates` Table

Stores the HTML templates for invitation emails. Each template has a `template_type` (`admin` or `client`).

```sql
CREATE TABLE IF NOT EXISTS invitation_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL DEFAULT 'Default Invitation',
  subject text NOT NULL DEFAULT 'Complete Your Account Registration',
  body_html text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT true,
  template_type text NOT NULL DEFAULT 'admin',  -- 'admin' or 'client'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invitation_email_templates ENABLE ROW LEVEL SECURITY;

-- Admins need read/write. Non-admin authenticated users need read.
CREATE POLICY "Authenticated users can read invitation templates"
  ON invitation_email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update invitation templates"
  ON invitation_email_templates FOR UPDATE
  TO authenticated
  USING (public.is_admin());
```

**Template Variables:**

| Variable | Description | Example Value |
|---|---|---|
| `{{name}}` | User's display name (falls back to username) | `John Doe` |
| `{{username}}` | User's login username | `JohnDoe123` |
| `{{reset_link}}` | Full URL to the password setup page with token | `https://app.example.com/password-setup?token=abc123` |
| `{{company_name}}` | Company name from `company_branding` table | `Acme Corporation` |
| `{{expiration_hours}}` | How long the link is valid | `48` |

### 3. `password_reset_templates` Table

Stores the HTML templates for forgot-username and forgot-password emails.

```sql
CREATE TABLE IF NOT EXISTS password_reset_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_templates ENABLE ROW LEVEL SECURITY;
```

**Template Types:**

| `template_type` | Purpose | Available Variables |
|---|---|---|
| `admin_forgot_username` | Admin portal - username reminder email | `{{username}}` |
| `admin_reset_password` | Admin portal - password reset link email | `{{reset_link}}` |
| `client_forgot_username` | Client portal - username reminder email | `{{username}}` |
| `client_reset_password` | Client portal - password reset link email | `{{reset_link}}` |

### 4. `user_registration_tokens` Table

One-time-use tokens for new user password setup (invitation flow).

```sql
CREATE TABLE IF NOT EXISTS user_registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,  -- Set to 48 hours from creation
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE user_registration_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_registration_tokens_token ON user_registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_registration_tokens_user ON user_registration_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_registration_tokens_expires ON user_registration_tokens(expires_at);
```

**Important:** After tightening RLS, direct client access is removed. Access is mediated through two SECURITY DEFINER functions:

```sql
CREATE OR REPLACE FUNCTION public.validate_registration_token(p_token text)
RETURNS TABLE(user_id uuid, expires_at timestamptz, used_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT t.user_id, t.expires_at, t.used_at
    FROM public.user_registration_tokens t
    WHERE t.token = p_token
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_registration_token_used(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_registration_tokens
  SET used_at = now(), is_used = true
  WHERE token = p_token AND used_at IS NULL;
END;
$$;
```

### 5. `password_reset_tokens` Table

One-time-use tokens for password resets (forgot-password flow).

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
```

### 6. `email_monitoring_config` Table (email sending credentials)

This table stores the OAuth credentials used to send emails. It supports Office 365 and Gmail.

```sql
CREATE TABLE IF NOT EXISTS email_monitoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'office365',  -- 'office365' or 'gmail'
  -- Office 365 fields
  tenant_id text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  -- Gmail fields
  gmail_client_id text DEFAULT '',
  gmail_client_secret text DEFAULT '',
  gmail_refresh_token text DEFAULT '',
  -- Common fields
  monitored_email text NOT NULL DEFAULT '',
  default_send_from_email text DEFAULT '',
  polling_interval integer NOT NULL DEFAULT 5,
  is_enabled boolean NOT NULL DEFAULT false,
  last_check timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 7. `company_branding` Table (app base URL + company name)

```sql
CREATE TABLE IF NOT EXISTS company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  logo_url text DEFAULT NULL,
  show_company_name boolean NOT NULL DEFAULT true,
  app_base_url text DEFAULT '',  -- e.g. 'https://app.example.com'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

The `app_base_url` is critical -- it's used to construct all email links (password setup, password reset). This prevents phishing via spoofed Origin headers.

### 8. `lookup_email_by_username` Function

Resolves a username to an email address for Supabase Auth login. Required because users log in with username, not email.

```sql
CREATE OR REPLACE FUNCTION public.lookup_email_by_username(
  p_username text,
  p_role_filter text DEFAULT NULL
)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_role_filter = 'client' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
        AND u.role = 'client'
      LIMIT 1;
  ELSIF p_role_filter = 'admin' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
        AND u.role != 'client'
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
      LIMIT 1;
  END IF;
END;
$$;
```

---

## Edge Functions (Server-Side)

All edge functions are Supabase Edge Functions (Deno runtime). They use the service role key for admin operations.

### 1. `manage-auth-user`

**Purpose:** Admin-only CRUD operations on user accounts.

**Endpoint:** `POST /functions/v1/manage-auth-user`

**Auth:** Requires a valid JWT in the `Authorization` header. Verifies the caller is an admin via `public.users.is_admin`.

**Actions:**

| Action | Params | Description |
|---|---|---|
| `create` | `email, username, isAdmin, role, name, password?` | Creates a Supabase Auth user + `public.users` row. If no password provided, uses `crypto.randomUUID()` as temporary password. Auth user is created with `email_confirm: true` (skip email verification). |
| `delete` | `userId` | Deletes the `public.users` row and the `auth.users` row. Cannot delete yourself. |
| `update_password` | `userId, password` | Updates password via `auth.admin.updateUserById`. |
| `change_own_password` | `currentPassword, newPassword` | Verifies current password by attempting `signInWithPassword`, then updates via admin API. Does NOT require admin role. |

**Key Implementation Details:**

```typescript
// Creating a user (simplified):
const { data: authUser, error } = await serviceClient.auth.admin.createUser({
  email,
  password: password || crypto.randomUUID(),
  email_confirm: true,
});

// Then insert into public.users with the same ID:
await serviceClient.from('users').insert({
  id: authUser.user.id,  // Same UUID!
  username, email, is_admin, is_active: true, role, name,
  permissions: JSON.stringify(defaultPermissions),
});

// If profile insert fails, rollback the auth user:
if (profileError) {
  await serviceClient.auth.admin.deleteUser(authUser.user.id);
}
```

### 2. `send-registration-email`

**Purpose:** Sends the invitation email to a user with a password setup link.

**Endpoint:** `POST /functions/v1/send-registration-email`

**Auth:** Requires admin role (verified via JWT + `public.users.is_admin` check).

**Request Body:**
```json
{
  "userId": "uuid-of-the-user",
  "templateType": "admin"  // or "client"
}
```

**Flow:**
1. Verify the caller is an admin
2. Look up the target user (id, email, username, name, invitation_sent_count)
3. Validate the user has an email address
4. Generate a secure 32-byte hex token
5. Insert the token into `user_registration_tokens` with a 48-hour expiry
6. Load the email config from `email_monitoring_config`
7. Load the app base URL from `company_branding.app_base_url`
8. Construct the registration URL: `{app_base_url}/password-setup?token={token}`
9. Load the invitation template from `invitation_email_templates` (matching `template_type` and `is_default = true`)
10. Replace all `{{variable}}` placeholders in subject and body
11. Send the email via Office 365 Graph API or Gmail API
12. Update `users.invitation_sent_at` and increment `users.invitation_sent_count`

**Token Generation:**
```typescript
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
```

**Template Variable Replacement:**
```typescript
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
```

**Email Sending (Office 365):**
```typescript
// 1. Get access token
const tokenResponse = await fetch(
  `https://login.microsoftonline.com/${emailConfig.tenant_id}/oauth2/v2.0/token`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: emailConfig.client_id,
      client_secret: emailConfig.client_secret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  }
);
const { access_token } = await tokenResponse.json();

// 2. Send email via Graph API
await fetch(
  `https://graph.microsoft.com/v1.0/users/${emailConfig.default_send_from_email}/sendMail`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: emailSubject,
        body: { contentType: "HTML", content: emailBody },
        toRecipients: [{ emailAddress: { address: targetUser.email } }],
      },
      saveToSentItems: false,
    }),
  }
);
```

**Email Sending (Gmail):**
```typescript
// 1. Get access token via refresh token
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: emailConfig.gmail_client_id,
    client_secret: emailConfig.gmail_client_secret,
    refresh_token: emailConfig.gmail_refresh_token,
    grant_type: "refresh_token",
  }),
});
const { access_token } = await tokenResponse.json();

// 2. Build raw RFC 2822 email and base64url encode it
function createRawEmail(from, to, subject, htmlBody) {
  const email = [
    `From: ${from}`, `To: ${to}`, `Subject: ${subject}`,
    "MIME-Version: 1.0", "Content-Type: text/html; charset=utf-8",
    "", htmlBody,
  ].join("\r\n");
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 3. Send via Gmail API
await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ raw: createRawEmail(from, to, subject, body) }),
});
```

### 3. `setup-password`

**Purpose:** Handles the password setup form submission from new users.

**Endpoint:** `POST /functions/v1/setup-password`

**Auth:** No JWT required (public endpoint -- user doesn't have a password yet). Security is via the one-time token.

**Request Body:**
```json
{
  "token": "hex-token-from-url",
  "newPassword": "user-chosen-password"
}
```

**Flow:**
1. Validate token and password are provided
2. Validate password is at least 8 characters
3. Look up the token in `user_registration_tokens`
4. Check token hasn't expired (`expires_at > now()`)
5. Check token hasn't been used (`used_at IS NULL`)
6. Update the auth user's password: `supabase.auth.admin.updateUserById(user_id, { password })`
7. Mark the token as used: `UPDATE user_registration_tokens SET used_at = now()`
8. Look up the user's role and return it (so the frontend knows where to redirect)

**Response:**
```json
{
  "success": true,
  "message": "Password has been set successfully",
  "role": "admin"  // or "client"
}
```

### 4. `forgot-password`

**Purpose:** Sends a password reset link to a user's email when they've forgotten their password.

**Endpoint:** `POST /functions/v1/forgot-password`

**Auth:** No JWT required (public endpoint).

**Request Body:**
```json
{
  "username": "the-users-username",
  "userType": "admin"  // or "client"
}
```

**Flow:**
1. Look up the user by username and role in `public.users`
2. If not found, return a generic success message (prevent username enumeration)
3. Insert a new row into `password_reset_tokens` (token auto-generated as UUID, 1-hour expiry)
4. Load the matching template from `password_reset_templates` (e.g., `admin_reset_password`)
5. Load `app_base_url` from `company_branding`
6. Construct reset link: `{app_base_url}/reset-password?token={token}&type={userType}`
7. Replace `{{reset_link}}` in the template body
8. Send the email via Office 365 or Gmail
9. Return generic success message

**Security:** Always returns the same success message whether the user exists or not, preventing username enumeration attacks.

### 5. `forgot-username`

**Purpose:** Sends a user their username when they've forgotten it.

**Endpoint:** `POST /functions/v1/forgot-username`

**Auth:** No JWT required (public endpoint).

**Request Body:**
```json
{
  "email": "user@example.com",
  "userType": "admin"
}
```

**Flow:**
1. Look up the user by email and role in `public.users`
2. If not found, return a generic success message (prevent email enumeration)
3. Load the matching template from `password_reset_templates` (e.g., `admin_forgot_username`)
4. Replace `{{username}}` in the template body
5. Send the email
6. Return generic success message

### 6. `reset-password`

**Purpose:** Handles the password reset form submission.

**Endpoint:** `POST /functions/v1/reset-password`

**Auth:** No JWT required (public endpoint). Security is via the one-time token.

**Request Body:**
```json
{
  "token": "uuid-token-from-url",
  "newPassword": "new-password"
}
```

**Flow:**
1. Look up the token in `password_reset_tokens`
2. Check token hasn't expired and hasn't been used
3. Look up the user profile
4. Look up the corresponding auth user (handles edge case where auth.users.id might differ)
5. Update the password: `supabase.auth.admin.updateUserById(authUserId, { password })`
6. Mark token as used

### 7. `login-with-username`

**Purpose:** Enables username-based login by resolving username to email, then authenticating via Supabase Auth.

**Endpoint:** `POST /functions/v1/login-with-username`

**Auth:** No JWT required.

**Request Body:**
```json
{
  "username": "the-username",
  "password": "the-password",
  "login_type": "admin"  // or "client"
}
```

**Flow:**
1. Call `lookup_email_by_username` RPC to resolve username to email
2. If not found, return "Invalid credentials"
3. Call Supabase Auth token endpoint with email + password
4. Return the session (access_token, refresh_token, etc.)

---

## Frontend Components

### 1. InvitationEmailTemplateEditor

**File:** `src/components/settings/InvitationEmailTemplateEditor.tsx`

A modal component that lets admins edit the invitation email template.

**Props:**
```typescript
interface InvitationEmailTemplateEditorProps {
  onClose: () => void;
  templateType?: 'admin' | 'client';
}
```

**Features:**
- Loads the default template for the given `templateType` from `invitation_email_templates`
- Editable fields: Template Name, Subject, Body HTML
- "Show Preview" button renders the HTML with sample variable values
- "Available Variables" panel with click-to-insert buttons
- Saves back to the database on "Save Template"

**Data Flow:**
```
Load: supabase.from('invitation_email_templates').select('*').eq('is_default', true).eq('template_type', templateType)
Save: supabase.from('invitation_email_templates').update({ template_name, subject, body_html }).eq('id', template.id)
```

### 2. PasswordResetTemplateEditor

**File:** `src/components/settings/PasswordResetTemplateEditor.tsx`

A modal component for editing forgot-username and forgot-password email templates.

**Props:**
```typescript
interface PasswordResetTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: 'admin_forgot_username' | 'admin_reset_password' | 'client_forgot_username' | 'client_reset_password';
}
```

**Features:**
- Loads template from `password_reset_templates` by `template_type`
- Shows available variables based on type (`{{username}}` for forgot-username, `{{reset_link}}` for reset-password)
- HTML preview with sample values
- Saves back to database

### 3. UserManagementSettings (Send Invite Button)

**File:** `src/components/settings/UserManagementSettings.tsx`

The user list displays a "Send Invite" button for each user. The handler:

```typescript
const handleSendRegistrationEmail = async (user: User) => {
  if (!user.email) {
    setError('Cannot send registration email - user has no email address');
    return;
  }
  setSendingEmail(user.id);
  try {
    const { data, error } = await supabase.functions.invoke('send-registration-email', {
      body: { userId: user.id, templateType: 'admin' }
    });
    if (error) throw error;
    if (data.success) {
      setSuccess(`Registration email sent to ${user.email}`);
      await loadUsers();  // Refresh to show updated invite count/date
    } else {
      setError(data.message || 'Failed to send registration email');
    }
  } catch (error: any) {
    setError(error.message || 'Failed to send registration email');
  } finally {
    setSendingEmail(null);
  }
};
```

**Add User Flow (3-step wizard):**
1. Step 1: Enter username, email, role, admin toggle
2. Step 2: Set permissions
3. Step 3: "Send Invite & Close" or "Skip, Close Without Sending"

The "Send Invite & Close" button calls:
```typescript
const handleSendInviteAndClose = async () => {
  const { data, error } = await supabase.functions.invoke('send-registration-email', {
    body: { userId: createdUserId, templateType: 'admin' }
  });
  // ... handle response, reset wizard state, refresh user list
};
```

### 4. ForgotCredentialsModal

**File:** `src/components/auth/ForgotCredentialsModal.tsx`

A modal shown on the login page with two options:
- "Forgot Username" -- asks for email, calls `forgot-username` edge function
- "Forgot Password" -- asks for username, calls `forgot-password` edge function

Both call their respective edge functions via `fetch`:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forgot-password`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ username, userType }),
  }
);
```

### 5. PasswordSetupPage

**File:** `src/components/PasswordSetupPage.tsx`

**Route:** `/password-setup?token=...`

Flow:
1. Reads `token` from URL query params
2. Validates the token via an RPC call (`validate_registration_token`)
3. If valid, shows password form with strength meter and requirements checklist
4. On submit, calls `setup-password` edge function with `{ token, newPassword }`
5. On success, redirects to `/` (admin) or `/client/login` (client) after 3 seconds

### 6. PasswordResetPage

**File:** `src/components/PasswordResetPage.tsx`

**Route:** `/reset-password?token=...&type=admin`

Flow:
1. Reads `token` and `type` from URL query params
2. Shows password form (simpler than setup page -- no strength meter)
3. On submit, calls `reset-password` edge function with `{ token, newPassword }`
4. On success, redirects to login page after 3 seconds

---

## Complete Flow Diagrams

### Flow 1: Admin Creates User & Sends Invite

```
Admin clicks "Add User"
  |
  v
Step 1: Enter username, email, role
  |
  v
Frontend calls manage-auth-user Edge Function
  { action: 'create', email, username, isAdmin, role }
  |
  v
Edge Function:
  1. auth.admin.createUser({ email, password: randomUUID, email_confirm: true })
  2. INSERT INTO public.users (id = auth_user.id, username, email, ...)
  |
  v
Step 2: Set permissions (saved to public.users.permissions)
  |
  v
Step 3: Admin clicks "Send Invite & Close"
  |
  v
Frontend calls send-registration-email Edge Function
  { userId, templateType: 'admin' }
  |
  v
Edge Function:
  1. Verify caller is admin
  2. Generate 32-byte hex token
  3. INSERT INTO user_registration_tokens (user_id, token, expires_at = now + 48h)
  4. Load email config from email_monitoring_config
  5. Load app_base_url from company_branding
  6. Build URL: {app_base_url}/password-setup?token={token}
  7. Load HTML template from invitation_email_templates
  8. Replace {{name}}, {{username}}, {{reset_link}}, {{company_name}}, {{expiration_hours}}
  9. Send email via Office 365 or Gmail
  10. UPDATE users SET invitation_sent_at = now(), invitation_sent_count = count + 1
  |
  v
User receives email with "Set Your Password" button
  |
  v
User clicks link -> /password-setup?token=abc123
  |
  v
PasswordSetupPage:
  1. Validate token via validate_registration_token RPC
  2. Show password form
  3. User enters password
  4. POST to setup-password Edge Function { token, newPassword }
  |
  v
Edge Function:
  1. Look up token in user_registration_tokens
  2. Verify not expired, not used
  3. auth.admin.updateUserById(user_id, { password: newPassword })
  4. Mark token used
  |
  v
User redirected to login page
```

### Flow 2: User Forgets Password

```
User clicks "Forgot Password" on login page
  |
  v
ForgotCredentialsModal: User enters username
  |
  v
POST to forgot-password Edge Function { username, userType }
  |
  v
Edge Function:
  1. Look up user by username + role
  2. If not found -> return generic success (prevent enumeration)
  3. INSERT INTO password_reset_tokens (user_id) -> auto-generates UUID token, 1hr expiry
  4. Load template from password_reset_templates (e.g. 'admin_reset_password')
  5. Build URL: {app_base_url}/reset-password?token={token}&type={userType}
  6. Replace {{reset_link}} in template
  7. Send email
  |
  v
User receives email with "Reset Password" button
  |
  v
User clicks link -> /reset-password?token=uuid&type=admin
  |
  v
PasswordResetPage:
  1. Show password form
  2. POST to reset-password Edge Function { token, newPassword }
  |
  v
Edge Function:
  1. Look up token in password_reset_tokens
  2. Verify not expired, not used
  3. auth.admin.updateUserById(user_id, { password: newPassword })
  4. Mark token used
  |
  v
User redirected to login page
```

---

## Implementation Steps

To implement this system in another application:

### Step 1: Database Setup

1. Create the `users` table with the schema above (ensure `id` matches `auth.users.id`)
2. Create `invitation_email_templates` with a default HTML template
3. Create `password_reset_templates` with 4 default templates
4. Create `user_registration_tokens` table
5. Create `password_reset_tokens` table
6. Add `app_base_url` column to your branding/settings table
7. Create the `email_monitoring_config` table (or adapt to your email provider setup)
8. Create the `lookup_email_by_username` function
9. Create `validate_registration_token` and `mark_registration_token_used` functions
10. Set up appropriate RLS policies

### Step 2: Edge Functions

Deploy these edge functions:
1. `manage-auth-user` -- user CRUD
2. `send-registration-email` -- invitation emails
3. `setup-password` -- password setup handler
4. `forgot-password` -- password reset email sender
5. `forgot-username` -- username reminder email sender
6. `reset-password` -- password reset handler
7. `login-with-username` -- username-based login

### Step 3: Frontend Routes

Add these routes:
- `/password-setup` -- PasswordSetupPage component
- `/reset-password` -- PasswordResetPage component

### Step 4: Frontend Components

1. **User Management** -- Add "Send Invite" button per user that calls `send-registration-email`
2. **Template Editors** -- InvitationEmailTemplateEditor and PasswordResetTemplateEditor modals
3. **Login Page** -- Add ForgotCredentialsModal

### Step 5: Configuration

1. Configure email provider credentials in `email_monitoring_config`
2. Set `app_base_url` in `company_branding` (the public-facing URL of your app)
3. Customize the default email templates via the admin UI

### Step 6: Default Email Template HTML

Insert a default invitation template. Here is the production template used:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Welcome to {{company_name}}!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello {{name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your account has been created! To complete your registration and access your account, please set your password by clicking the button below.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This link will expire in <strong>{{expiration_hours}} hours</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{reset_link}}" style="display: inline-block; padding: 16px 32px; background-color: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #14b8a6; font-size: 13px; word-break: break-all; margin: 10px 0 0 0;">
                {{reset_link}}
              </p>
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0;">
                If you didn't request this registration, please ignore this email or contact your administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                {{company_name}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Environment Variables Required

The edge functions rely on these auto-populated Supabase environment variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (for client-side auth verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for admin operations) |

The frontend uses:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL`, exposed to the frontend |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY`, exposed to the frontend |

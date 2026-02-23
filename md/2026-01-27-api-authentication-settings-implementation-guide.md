# API Authentication Settings - Implementation Guide

**Date:** 2026-01-27

This document provides a complete guide for implementing a multi-configuration API authentication system that manages OAuth-style token authentication for external API services.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Authentication Manager Library](#authentication-manager-library)
4. [Config Service Functions](#config-service-functions)
5. [UI Component](#ui-component)
6. [Usage Examples](#usage-examples)
7. [Flow Diagram](#flow-diagram)

---

## Overview

This feature allows users to configure multiple API authentication endpoints. Each configuration stores:

- **Configuration Name** - A friendly identifier (e.g., "Synergize", "TruckMate API")
- **Login Endpoint** - POST URL that accepts username/password and returns a token
- **Ping Endpoint** - Optional URL to validate if a token is still valid
- **Token Field Name** - The JSON field name in the login response containing the token (e.g., `access_token`, `token`, `accessToken`)
- **Username/Password** - Credentials for authentication

The system automatically:
- Retrieves tokens when needed
- Caches tokens in memory
- Validates tokens using ping endpoint
- Re-authenticates when tokens expire
- Prevents duplicate concurrent login requests

---

## Database Schema

### Table: `api_auth_config`

```sql
CREATE TABLE IF NOT EXISTS api_auth_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default',
  login_endpoint text NOT NULL DEFAULT '',
  ping_endpoint text NOT NULL DEFAULT '',
  token_field_name text NOT NULL DEFAULT 'access_token',
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE api_auth_config ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_auth_config_is_active ON api_auth_config(is_active);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | Unique friendly name for this configuration |
| `login_endpoint` | text | Full URL for POST login request |
| `ping_endpoint` | text | Optional URL to validate token validity |
| `token_field_name` | text | JSON field name containing the token in login response |
| `username` | text | Authentication username |
| `password` | text | Authentication password |
| `is_active` | boolean | Whether this configuration is enabled |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last modification timestamp |

### RLS Policies

Create appropriate RLS policies based on your application's authentication model:

```sql
-- Example for anon role (adjust based on your auth model)
CREATE POLICY "Allow select on api_auth_config"
  ON api_auth_config FOR SELECT USING (true);

CREATE POLICY "Allow insert on api_auth_config"
  ON api_auth_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on api_auth_config"
  ON api_auth_config FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on api_auth_config"
  ON api_auth_config FOR DELETE USING (true);
```

---

## Authentication Manager Library

This is a singleton class that manages token retrieval, caching, and validation.

### File: `lib/authenticationManager.ts`

```typescript
export interface ApiAuthConfig {
  id?: string;
  name: string;
  loginEndpoint: string;
  pingEndpoint: string;
  tokenFieldName?: string;
  username: string;
  password: string;
  isActive: boolean;
}

interface AuthState {
  token: string | null;
  username: string;
  password: string;
  loginEndpoint: string;
  pingEndpoint: string;
  tokenFieldName: string;
  lastPingTime: number;
}

const PING_THROTTLE_MS = 30000; // 30 seconds between ping checks

export class AuthenticationManager {
  private static instance: AuthenticationManager | null = null;
  private configs: Map<string, AuthState> = new Map();
  private pendingTokenPromises: Map<string, Promise<string>> = new Map();
  private defaultConfigName: string | null = null;

  private constructor() {}

  public static getInstance(): AuthenticationManager {
    if (!AuthenticationManager.instance) {
      AuthenticationManager.instance = new AuthenticationManager();
    }
    return AuthenticationManager.instance;
  }

  public static resetInstance(): void {
    AuthenticationManager.instance = null;
  }

  /**
   * Initialize a configuration. Call this for each auth config from the database.
   */
  public initialize(config: ApiAuthConfig): void {
    const state: AuthState = {
      username: config.username,
      password: config.password,
      loginEndpoint: config.loginEndpoint,
      pingEndpoint: config.pingEndpoint,
      tokenFieldName: config.tokenFieldName || 'access_token',
      token: null,
      lastPingTime: 0
    };

    this.configs.set(config.name, state);

    // First config becomes the default
    if (!this.defaultConfigName) {
      this.defaultConfigName = config.name;
    }
  }

  /**
   * Initialize multiple configurations at once
   */
  public initializeMultiple(configs: ApiAuthConfig[]): void {
    configs.forEach(config => this.initialize(config));
  }

  /**
   * Set which config should be used when no name is specified
   */
  public setDefaultConfig(name: string): void {
    if (this.configs.has(name)) {
      this.defaultConfigName = name;
    }
  }

  /**
   * Get list of all configured auth names
   */
  public getConfigNames(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Check if a config exists
   */
  public hasConfig(name: string): boolean {
    return this.configs.has(name);
  }

  /**
   * Remove a configuration
   */
  public removeConfig(name: string): void {
    this.configs.delete(name);
    this.pendingTokenPromises.delete(name);
    if (this.defaultConfigName === name) {
      const remaining = Array.from(this.configs.keys());
      this.defaultConfigName = remaining.length > 0 ? remaining[0] : null;
    }
  }

  /**
   * Check if a config is properly initialized with required fields
   */
  public isInitialized(configName?: string): boolean {
    const name = configName || this.defaultConfigName;
    if (!name) return false;

    const state = this.configs.get(name);
    if (!state) return false;

    return state.loginEndpoint !== '' &&
           state.username !== '' &&
           state.password !== '';
  }

  /**
   * Get a valid token for the specified config.
   * This is the main method to use when making API calls.
   *
   * - Returns cached token if valid
   * - Pings to validate token if cached
   * - Re-authenticates if token is invalid or missing
   * - Prevents duplicate concurrent login requests
   */
  public async getToken(configName?: string): Promise<string> {
    const name = configName || this.defaultConfigName;
    if (!name) {
      throw new Error('No authentication configuration specified and no default set.');
    }

    if (!this.isInitialized(name)) {
      throw new Error(`AuthenticationManager not initialized for config "${name}". Call initialize() with valid config first.`);
    }

    // Prevent duplicate concurrent requests for the same config
    const existingPromise = this.pendingTokenPromises.get(name);
    if (existingPromise) {
      return existingPromise;
    }

    const tokenPromise = this.resolveToken(name);
    this.pendingTokenPromises.set(name, tokenPromise);

    try {
      const token = await tokenPromise;
      return token;
    } finally {
      this.pendingTokenPromises.delete(name);
    }
  }

  private async resolveToken(configName: string): Promise<string> {
    const state = this.configs.get(configName);
    if (!state) {
      throw new Error(`Config "${configName}" not found`);
    }

    // No token cached - perform login
    if (!state.token) {
      return this.performLogin(configName);
    }

    // Check if we should ping (throttled to prevent excessive requests)
    const now = Date.now();
    if (now - state.lastPingTime < PING_THROTTLE_MS) {
      return state.token;
    }

    // Validate token with ping
    const isValid = await this.pingToken(configName);
    if (isValid) {
      state.lastPingTime = now;
      return state.token!;
    }

    // Token invalid - re-authenticate
    return this.performLogin(configName);
  }

  private async pingToken(configName: string): Promise<boolean> {
    const state = this.configs.get(configName);
    if (!state || !state.pingEndpoint || !state.token) {
      return false;
    }

    try {
      const response = await fetch(state.pingEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        }
      });

      // 204 No Content or any 2xx is considered valid
      return response.status === 204 || response.ok;
    } catch (error) {
      console.warn(`Ping request failed for "${configName}":`, error);
      return false;
    }
  }

  private async performLogin(configName: string): Promise<string> {
    const state = this.configs.get(configName);
    if (!state) {
      throw new Error(`Config "${configName}" not found`);
    }

    try {
      const response = await fetch(state.loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: state.username,
          password: state.password
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Login failed for "${configName}": ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();
      const tokenFieldName = state.tokenFieldName;

      if (!data[tokenFieldName]) {
        throw new Error(`Login response missing '${tokenFieldName}' field for "${configName}"`);
      }

      state.token = data[tokenFieldName];
      state.lastPingTime = Date.now();

      return state.token;
    } catch (error) {
      state.token = null;
      state.lastPingTime = 0;
      throw error;
    }
  }

  /**
   * Clear cached token(s), forcing re-authentication on next getToken()
   */
  public clearToken(configName?: string): void {
    if (configName) {
      const state = this.configs.get(configName);
      if (state) {
        state.token = null;
        state.lastPingTime = 0;
      }
    } else {
      // Clear all tokens
      this.configs.forEach(state => {
        state.token = null;
        state.lastPingTime = 0;
      });
    }
  }

  /**
   * Get the config details (without the cached token)
   */
  public getConfig(configName?: string): Omit<ApiAuthConfig, 'id'> | null {
    const name = configName || this.defaultConfigName;
    if (!name) return null;

    const state = this.configs.get(name);
    if (!state) return null;

    return {
      name: name,
      loginEndpoint: state.loginEndpoint,
      pingEndpoint: state.pingEndpoint,
      tokenFieldName: state.tokenFieldName,
      username: state.username,
      password: state.password,
      isActive: true
    };
  }

  /**
   * Check if a token is currently cached
   */
  public hasToken(configName?: string): boolean {
    const name = configName || this.defaultConfigName;
    if (!name) return false;

    const state = this.configs.get(name);
    return state?.token !== null;
  }
}

// Export singleton instance for convenience
export const AuthManager = AuthenticationManager.getInstance();
```

---

## Config Service Functions

These functions handle database CRUD operations.

### File: `services/configService.ts` (relevant section)

```typescript
import { supabase } from '../lib/supabase';

// TypeScript interface matching the database schema
export interface ApiAuthConfigDB {
  id: string;
  name: string;
  loginEndpoint: string;
  pingEndpoint: string;
  tokenFieldName: string;
  username: string;
  password: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all authentication configurations
 */
export async function fetchAllApiAuthConfigs(): Promise<ApiAuthConfigDB[]> {
  try {
    const { data, error } = await supabase
      .from('api_auth_config')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      loginEndpoint: item.login_endpoint,
      pingEndpoint: item.ping_endpoint,
      tokenFieldName: item.token_field_name || 'access_token',
      username: item.username,
      password: item.password,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error fetching all API auth configs:', error);
    throw error;
  }
}

/**
 * Fetch a single configuration by ID
 */
export async function fetchApiAuthConfigById(id: string): Promise<ApiAuthConfigDB | null> {
  try {
    const { data, error } = await supabase
      .from('api_auth_config')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        loginEndpoint: data.login_endpoint,
        pingEndpoint: data.ping_endpoint,
        tokenFieldName: data.token_field_name || 'access_token',
        username: data.username,
        password: data.password,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching API auth config by ID:', error);
    throw error;
  }
}

/**
 * Fetch a single configuration by name
 */
export async function fetchApiAuthConfigByName(name: string): Promise<ApiAuthConfigDB | null> {
  try {
    const { data, error } = await supabase
      .from('api_auth_config')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        loginEndpoint: data.login_endpoint,
        pingEndpoint: data.ping_endpoint,
        tokenFieldName: data.token_field_name || 'access_token',
        username: data.username,
        password: data.password,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching API auth config by name:', error);
    throw error;
  }
}

/**
 * Create a new authentication configuration
 */
export async function createApiAuthConfig(
  config: Omit<ApiAuthConfigDB, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiAuthConfigDB> {
  try {
    const configData = {
      name: config.name,
      login_endpoint: config.loginEndpoint,
      ping_endpoint: config.pingEndpoint,
      token_field_name: config.tokenFieldName || 'access_token',
      username: config.username,
      password: config.password,
      is_active: config.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('api_auth_config')
      .insert([configData])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      loginEndpoint: data.login_endpoint,
      pingEndpoint: data.ping_endpoint,
      tokenFieldName: data.token_field_name || 'access_token',
      username: data.username,
      password: data.password,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error creating API auth config:', error);
    throw error;
  }
}

/**
 * Update an existing configuration
 */
export async function updateApiAuthConfig(
  id: string,
  config: Omit<ApiAuthConfigDB, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiAuthConfigDB> {
  try {
    const configData = {
      name: config.name,
      login_endpoint: config.loginEndpoint,
      ping_endpoint: config.pingEndpoint,
      token_field_name: config.tokenFieldName || 'access_token',
      username: config.username,
      password: config.password,
      is_active: config.isActive,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('api_auth_config')
      .update(configData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      loginEndpoint: data.login_endpoint,
      pingEndpoint: data.ping_endpoint,
      tokenFieldName: data.token_field_name || 'access_token',
      username: data.username,
      password: data.password,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating API auth config:', error);
    throw error;
  }
}

/**
 * Delete a configuration
 */
export async function deleteApiAuthConfig(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_auth_config')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting API auth config:', error);
    throw error;
  }
}

/**
 * Test an authentication configuration without saving
 */
export async function testApiAuthConnection(
  loginEndpoint: string,
  pingEndpoint: string,
  username: string,
  password: string,
  tokenFieldName: string = 'access_token'
): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    // Step 1: Test login endpoint
    const loginResponse = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text().catch(() => '');
      return {
        success: false,
        message: `Login failed: ${loginResponse.status} ${loginResponse.statusText}${errorText ? ` - ${errorText}` : ''}`
      };
    }

    const loginData = await loginResponse.json();
    const token = loginData[tokenFieldName];

    if (!token) {
      return {
        success: false,
        message: `Login response missing '${tokenFieldName}' field. Available fields: ${Object.keys(loginData).join(', ')}`
      };
    }

    // Step 2: Test ping endpoint (if provided)
    if (pingEndpoint) {
      const pingResponse = await fetch(pingEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!pingResponse.ok && pingResponse.status !== 204) {
        return {
          success: false,
          message: `Login successful but ping failed: ${pingResponse.status} ${pingResponse.statusText}`
        };
      }

      return {
        success: true,
        message: 'Login and Ping successful',
        token
      };
    }

    return {
      success: true,
      message: 'Login successful (no ping endpoint configured)',
      token
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection error: ${error.message}`
    };
  }
}
```

---

## UI Component

The UI provides a master-detail interface with:
- Left panel: List of configurations
- Right panel: Edit form for selected configuration

### Key Features

1. **Configuration List** - Shows all saved auth configurations with visual selection indicator
2. **New Configuration** - Button to create a new configuration
3. **Edit Form** - Fields for name, endpoints, token field name, and credentials
4. **Test Button** - Tests the connection without saving
5. **Save Button** - Saves the configuration to database
6. **Delete Button** - Removes a configuration with confirmation modal
7. **Usage Example** - Shows code snippet for using the configuration

### Form Fields

| Field | Required | Description |
|-------|----------|-------------|
| Configuration Name | Yes | Unique identifier used in code |
| Login Endpoint | Yes | POST URL for authentication |
| Ping Endpoint | No | URL to validate token validity |
| Token Field Name | Yes | JSON field name in login response (default: `access_token`) |
| Username | Yes | Authentication username |
| Password | Yes | Authentication password |

### UI Layout

```
+----------------------------------+
|  Token Authentication      [+ New Authentication]
|  Configure multiple API...
+----------------------------------+
| +--------+ +-------------------+ |
| |Configs | | Edit: Synergize   | |
| |--------| | [Delete][Test][Save]|
| |        | |                   | |
| |Synergize| | [Success/Error]   | |
| |TruckMate| |                   | |
| |        | | Configuration Name | |
| |        | | [________________] | |
| |        | |                   | |
| |        | | API Endpoints     | |
| |        | | Login: [________] | |
| |        | | Ping:  [________] | |
| |        | | Token: [________] | |
| |        | |                   | |
| |        | | Credentials       | |
| |        | | User: [__________]| |
| |        | | Pass: [__________]| |
| |        | |                   | |
| |        | | Usage Example     | |
| |        | | [code snippet]    | |
| +--------+ +-------------------+ |
+----------------------------------+
```

---

## Usage Examples

### Initialize AuthManager on App Load

```typescript
import { AuthManager } from '../lib/authenticationManager';
import { fetchAllApiAuthConfigs } from '../services/configService';

// In your app initialization or component mount:
async function initializeAuth() {
  const configs = await fetchAllApiAuthConfigs();

  configs.forEach(config => {
    AuthManager.initialize({
      name: config.name,
      loginEndpoint: config.loginEndpoint,
      pingEndpoint: config.pingEndpoint,
      tokenFieldName: config.tokenFieldName,
      username: config.username,
      password: config.password,
      isActive: config.isActive
    });
  });
}
```

### Making Authenticated API Calls

```typescript
import { AuthManager } from '../lib/authenticationManager';

// Using a specific config by name
async function fetchDataFromSynergize() {
  const token = await AuthManager.getToken('Synergize');

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}

// Using the default config (first initialized)
async function fetchData() {
  const token = await AuthManager.getToken();

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}
```

### Handling Multiple APIs in One Request

```typescript
import { AuthManager } from '../lib/authenticationManager';

async function fetchFromMultipleAPIs() {
  // Get tokens for different services
  const synergizeToken = await AuthManager.getToken('Synergize');
  const truckMateToken = await AuthManager.getToken('TruckMate');

  // Make parallel requests
  const [synergizeData, truckMateData] = await Promise.all([
    fetch('https://synergize.api.com/orders', {
      headers: { 'Authorization': `Bearer ${synergizeToken}` }
    }).then(r => r.json()),

    fetch('https://truckmate.api.com/shipments', {
      headers: { 'Authorization': `Bearer ${truckMateToken}` }
    }).then(r => r.json())
  ]);

  return { synergizeData, truckMateData };
}
```

### Force Re-authentication

```typescript
import { AuthManager } from '../lib/authenticationManager';

// Clear a specific config's token
AuthManager.clearToken('Synergize');

// Clear all tokens
AuthManager.clearToken();

// Next getToken() call will re-authenticate
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Fetch configs from api_auth_config table           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         AuthManager.initialize() for each config             │
│         (Stores credentials in memory Map)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Ready                         │
└─────────────────────────────────────────────────────────────┘

================== When API Call Needed ==================

┌─────────────────────────────────────────────────────────────┐
│               AuthManager.getToken('ConfigName')             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Token cached?   │
                    └─────────────────┘
                       │           │
                      No          Yes
                       │           │
                       ▼           ▼
              ┌──────────────┐  ┌─────────────────┐
              │ performLogin │  │ Ping throttled? │
              └──────────────┘  └─────────────────┘
                       │           │           │
                       │          No          Yes
                       │           │           │
                       │           ▼           │
                       │   ┌────────────┐      │
                       │   │ pingToken  │      │
                       │   └────────────┘      │
                       │      │       │        │
                       │   Invalid  Valid      │
                       │      │       │        │
                       │      ▼       │        │
                       │  ┌──────┐    │        │
                       │  │Login │    │        │
                       │  └──────┘    │        │
                       ▼      │       ▼        ▼
                 ┌─────────────────────────────────┐
                 │      Return Token               │
                 └─────────────────────────────────┘
```

---

## API Expected Formats

### Login Request

```http
POST /api/login HTTP/1.1
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### Login Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

The `token_field_name` configuration determines which field to extract (e.g., `access_token`, `token`, `accessToken`).

### Ping Request

```http
POST /api/ping HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Ping Response

- `204 No Content` - Token is valid
- `200 OK` - Token is valid
- `401 Unauthorized` - Token is invalid, re-authentication needed

---

## Summary

This authentication system provides:

1. **Multi-config support** - Manage multiple API authentications
2. **Automatic token management** - Tokens are cached and refreshed automatically
3. **Concurrency handling** - Prevents duplicate login requests
4. **Configurable token field** - Works with different API response formats
5. **Test functionality** - Validate configurations before saving
6. **Clean UI** - Master-detail interface for managing configurations

The system is designed to be simple to use in application code - just call `AuthManager.getToken('ConfigName')` and the library handles all the complexity of token lifecycle management.

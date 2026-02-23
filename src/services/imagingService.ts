import { supabase } from '../lib/supabase';
import type { ImagingBucket, ImagingDocumentType, ImagingDocument, ImagingBarcodePattern, ImagingUnindexedItem, ImagingEmailMonitoringConfig } from '../types';

function mapBucket(row: any): ImagingBucket {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocumentType(row: any): ImagingDocumentType {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: any): ImagingDocument {
  return {
    id: row.id,
    bucketId: row.bucket_id,
    documentTypeId: row.document_type_id,
    detailLineId: row.detail_line_id,
    billNumber: row.bill_number || '',
    storagePath: row.storage_path,
    originalFilename: row.original_filename || '',
    fileSize: row.file_size || 0,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bucketName: row.imaging_buckets?.name,
    documentTypeName: row.imaging_document_types?.name,
    bucketUrl: row.imaging_buckets?.url,
  };
}

export async function fetchBuckets(): Promise<ImagingBucket[]> {
  const { data, error } = await supabase
    .from('imaging_buckets')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(mapBucket);
}

export async function createBucket(name: string, url: string, description: string): Promise<ImagingBucket> {
  const { data, error } = await supabase
    .from('imaging_buckets')
    .insert({ name, url, description })
    .select()
    .single();
  if (error) throw error;
  return mapBucket(data);
}

export async function updateBucket(id: string, updates: Partial<Pick<ImagingBucket, 'name' | 'url' | 'description' | 'isActive'>>): Promise<void> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.url !== undefined) dbUpdates.url = updates.url;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  const { error } = await supabase.from('imaging_buckets').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteBucket(id: string): Promise<void> {
  const { error } = await supabase.from('imaging_buckets').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDocumentTypes(): Promise<ImagingDocumentType[]> {
  const { data, error } = await supabase
    .from('imaging_document_types')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(mapDocumentType);
}

export async function createDocumentType(name: string, description: string): Promise<ImagingDocumentType> {
  const { data, error } = await supabase
    .from('imaging_document_types')
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  return mapDocumentType(data);
}

export async function updateDocumentType(id: string, updates: Partial<Pick<ImagingDocumentType, 'name' | 'description' | 'isActive'>>): Promise<void> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  const { error } = await supabase.from('imaging_document_types').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteDocumentType(id: string): Promise<void> {
  const { error } = await supabase.from('imaging_document_types').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDocuments(filters?: {
  bucketId?: string;
  documentTypeId?: string;
  search?: string;
}): Promise<ImagingDocument[]> {
  let query = supabase
    .from('imaging_documents')
    .select('*, imaging_buckets(name, url), imaging_document_types(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.bucketId) {
    query = query.eq('bucket_id', filters.bucketId);
  }
  if (filters?.documentTypeId) {
    query = query.eq('document_type_id', filters.documentTypeId);
  }
  if (filters?.search) {
    query = query.or(`detail_line_id.ilike.%${filters.search}%,bill_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapDocument);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('imaging_documents').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDocument(params: {
  file: File;
  bucketId: string;
  documentTypeId: string;
  billNumber: string;
}): Promise<ImagingDocument> {
  const fileId = crypto.randomUUID();
  const ext = params.file.name.split('.').pop() || 'pdf';
  const storagePath = `imaging/manual/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('pdfs')
    .upload(storagePath, params.file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl || storagePath;

  const detailLineId = `MANUAL-${fileId.substring(0, 8).toUpperCase()}`;

  const { data, error } = await supabase
    .from('imaging_documents')
    .insert({
      bucket_id: params.bucketId,
      document_type_id: params.documentTypeId,
      detail_line_id: detailLineId,
      bill_number: params.billNumber || '',
      storage_path: publicUrl,
      original_filename: params.file.name,
      file_size: params.file.size,
    })
    .select('*, imaging_buckets(name, url), imaging_document_types(name)')
    .single();
  if (error) throw error;
  return mapDocument(data);
}

function mapBarcodePattern(row: any): ImagingBarcodePattern {
  return {
    id: row.id,
    name: row.name || '',
    patternTemplate: row.pattern_template,
    separator: row.separator || '-',
    fixedDocumentType: row.fixed_document_type || null,
    bucketId: row.bucket_id,
    priority: row.priority || 0,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bucketName: row.imaging_buckets?.name,
  };
}

function mapUnindexedItem(row: any): ImagingUnindexedItem {
  return {
    id: row.id,
    bucketId: row.bucket_id,
    storagePath: row.storage_path,
    originalFilename: row.original_filename || '',
    fileSize: row.file_size || 0,
    detectedBarcodes: row.detected_barcodes || [],
    sourceSftpConfigId: row.source_sftp_config_id,
    sourceEmailConfigId: row.source_email_config_id || null,
    sourceType: row.source_type || 'sftp',
    status: row.status,
    detailLineId: row.detail_line_id,
    documentTypeId: row.document_type_id,
    billNumber: row.bill_number,
    indexedBy: row.indexed_by,
    indexedAt: row.indexed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bucketName: row.imaging_buckets?.name,
    bucketUrl: row.imaging_buckets?.url,
    documentTypeName: row.imaging_document_types?.name,
  };
}

export async function fetchBarcodePatterns(): Promise<ImagingBarcodePattern[]> {
  const { data, error } = await supabase
    .from('imaging_barcode_patterns')
    .select('*, imaging_buckets(name)')
    .order('priority')
    .order('name');
  if (error) throw error;
  return (data || []).map(mapBarcodePattern);
}

export async function createBarcodePattern(pattern: {
  name: string;
  patternTemplate: string;
  separator: string;
  fixedDocumentType: string | null;
  bucketId: string;
  priority: number;
}): Promise<ImagingBarcodePattern> {
  const { data, error } = await supabase
    .from('imaging_barcode_patterns')
    .insert({
      name: pattern.name,
      pattern_template: pattern.patternTemplate,
      separator: pattern.separator,
      fixed_document_type: pattern.fixedDocumentType || null,
      bucket_id: pattern.bucketId,
      priority: pattern.priority,
    })
    .select('*, imaging_buckets(name)')
    .single();
  if (error) throw error;
  return mapBarcodePattern(data);
}

export async function updateBarcodePattern(id: string, updates: Partial<{
  name: string;
  patternTemplate: string;
  separator: string;
  fixedDocumentType: string | null;
  bucketId: string;
  priority: number;
  isActive: boolean;
}>): Promise<void> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.patternTemplate !== undefined) dbUpdates.pattern_template = updates.patternTemplate;
  if (updates.separator !== undefined) dbUpdates.separator = updates.separator;
  if (updates.fixedDocumentType !== undefined) dbUpdates.fixed_document_type = updates.fixedDocumentType || null;
  if (updates.bucketId !== undefined) dbUpdates.bucket_id = updates.bucketId;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  const { error } = await supabase.from('imaging_barcode_patterns').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteBarcodePattern(id: string): Promise<void> {
  const { error } = await supabase.from('imaging_barcode_patterns').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchUnindexedQueue(filters?: {
  bucketId?: string;
  status?: string;
}): Promise<ImagingUnindexedItem[]> {
  let query = supabase
    .from('imaging_unindexed_queue')
    .select('*, imaging_buckets(name, url), imaging_document_types(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.bucketId) {
    query = query.eq('bucket_id', filters.bucketId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'pending');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapUnindexedItem);
}

export async function indexUnindexedItem(id: string, params: {
  detailLineId: string;
  documentTypeId: string;
  billNumber?: string;
  bucketId: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
}): Promise<void> {
  const { error: docError } = await supabase
    .from('imaging_documents')
    .insert({
      bucket_id: params.bucketId,
      document_type_id: params.documentTypeId,
      detail_line_id: params.detailLineId,
      bill_number: params.billNumber || '',
      storage_path: params.storagePath,
      original_filename: params.originalFilename,
      file_size: params.fileSize,
    });
  if (docError) throw docError;

  const { error: queueError } = await supabase
    .from('imaging_unindexed_queue')
    .update({
      status: 'indexed',
      detail_line_id: params.detailLineId,
      document_type_id: params.documentTypeId,
      bill_number: params.billNumber || null,
      indexed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (queueError) throw queueError;
}

export async function discardUnindexedItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('imaging_unindexed_queue')
    .update({
      status: 'discarded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchImagingEmailConfig(): Promise<ImagingEmailMonitoringConfig> {
  const { data, error } = await supabase
    .from('imaging_email_monitoring_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const c = data[0];
    return {
      provider: c.provider || 'office365',
      tenantId: c.tenant_id || '',
      clientId: c.client_id || '',
      clientSecret: c.client_secret || '',
      gmailClientId: c.gmail_client_id || '',
      gmailClientSecret: c.gmail_client_secret || '',
      gmailRefreshToken: c.gmail_refresh_token || '',
      monitoredEmail: c.monitored_email || '',
      gmailMonitoredLabel: c.gmail_monitored_label || 'INBOX',
      imagingBucketId: c.imaging_bucket_id || null,
      pollingInterval: c.polling_interval || 5,
      isEnabled: c.is_enabled || false,
      lastCheck: c.last_check,
      checkAllMessages: c.check_all_messages || false,
      postProcessAction: c.post_process_action || 'mark_read',
      processedFolderPath: c.processed_folder_path || 'Processed',
      postProcessActionOnFailure: c.post_process_action_on_failure || 'none',
      failureFolderPath: c.failure_folder_path || 'Failed',
      cronEnabled: c.cron_enabled || false,
      cronJobId: c.cron_job_id,
      cronSchedule: c.cron_schedule,
      lastCronRun: c.last_cron_run,
      nextCronRun: c.next_cron_run,
    };
  }

  return {
    provider: 'office365',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    monitoredEmail: '',
    gmailMonitoredLabel: 'INBOX',
    imagingBucketId: null,
    pollingInterval: 5,
    isEnabled: false,
    checkAllMessages: false,
    postProcessAction: 'mark_read',
    processedFolderPath: 'Processed',
    postProcessActionOnFailure: 'none',
    failureFolderPath: 'Failed',
  };
}

export async function updateImagingEmailConfig(config: ImagingEmailMonitoringConfig): Promise<void> {
  const { data: existing } = await supabase
    .from('imaging_email_monitoring_config')
    .select('id')
    .limit(1);

  const dbData = {
    provider: config.provider,
    tenant_id: config.tenantId,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    gmail_client_id: config.gmailClientId,
    gmail_client_secret: config.gmailClientSecret,
    gmail_refresh_token: config.gmailRefreshToken,
    monitored_email: config.monitoredEmail,
    gmail_monitored_label: config.gmailMonitoredLabel,
    imaging_bucket_id: config.imagingBucketId || null,
    polling_interval: config.pollingInterval,
    is_enabled: config.isEnabled,
    check_all_messages: config.checkAllMessages,
    post_process_action: config.postProcessAction,
    processed_folder_path: config.processedFolderPath,
    post_process_action_on_failure: config.postProcessActionOnFailure,
    failure_folder_path: config.failureFolderPath,
    updated_at: new Date().toISOString(),
  };

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('imaging_email_monitoring_config')
      .update(dbData)
      .eq('id', existing[0].id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('imaging_email_monitoring_config')
      .insert([dbData]);
    if (error) throw error;
  }
}

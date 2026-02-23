import { supabase } from '../lib/supabase';
import type { EmailPollingLog, SftpPollingLog, ProcessedEmail } from '../types';

export async function fetchEmailPollingLogs(): Promise<EmailPollingLog[]> {
  try {
    const { data, error } = await supabase
      .from('email_polling_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      provider: log.provider,
      status: log.status,
      emailsFound: log.emails_found,
      emailsProcessed: log.emails_processed,
      emailsFailed: log.emails_failed || 0,
      errorMessage: log.error_message,
      executionTimeMs: log.execution_time_ms,
      createdAt: log.created_at
    }));
  } catch (error) {
    console.error('Error fetching email polling logs:', error);
    throw error;
  }
}

export async function fetchSftpPollingLogs(): Promise<SftpPollingLog[]> {
  try {
    const { data, error } = await supabase
      .from('sftp_polling_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map(log => ({
      id: log.id,
      configId: log.config_id,
      timestamp: log.timestamp,
      status: log.status,
      filesFound: log.files_found,
      filesProcessed: log.files_processed,
      errorMessage: log.error_message,
      executionTimeMs: log.execution_time_ms,
      createdAt: log.created_at
    }));
  } catch (error) {
    console.error('Error fetching SFTP polling logs:', error);
    throw error;
  }
}

export async function fetchProcessedEmails(): Promise<ProcessedEmail[]> {
  try {
    const { data, error} = await supabase
      .from('processed_emails')
      .select('*')
      .order('received_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map(email => ({
      id: email.id,
      emailId: email.email_id,
      sender: email.sender,
      subject: email.subject,
      receivedDate: email.received_date,
      processingRuleId: email.processing_rule_id,
      extractionTypeId: email.extraction_type_id,
      pdfFilename: email.pdf_filename,
      attachmentCount: email.attachment_count,
      pdfFilenames: email.pdf_filenames,
      attachmentPageCounts: email.attachment_page_counts,
      processingStatus: email.processing_status,
      errorMessage: email.error_message,
      parseitId: email.parseit_id,
      processedAt: email.processed_at
    }));
  } catch (error) {
    console.error('Error fetching processed emails:', error);
    throw error;
  }
}

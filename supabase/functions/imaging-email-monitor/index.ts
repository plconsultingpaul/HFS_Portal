import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImagingEmailConfig {
  id: string;
  provider: "office365" | "gmail";
  tenant_id: string;
  client_id: string;
  client_secret: string;
  gmail_client_id: string;
  gmail_client_secret: string;
  gmail_refresh_token: string;
  monitored_email: string;
  gmail_monitored_label: string;
  imaging_bucket_id: string | null;
  polling_interval: number;
  is_enabled: boolean;
  last_check: string | null;
  check_all_messages: boolean;
  post_process_action: string;
  processed_folder_path: string;
  post_process_action_on_failure: string;
  failure_folder_path: string;
}

interface PdfAttachment {
  filename: string;
  base64: string;
  pageCount: number;
}

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  receivedDate: string;
}

async function getPdfPageCount(base64: string): Promise<number> {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 1;
  }
}

async function office365Authenticate(
  config: ImagingEmailConfig
): Promise<string> {
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.client_id || "",
        client_secret: config.client_secret || "",
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Office365 auth failed: ${errText}`);
  }
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function office365FetchEmails(
  config: ImagingEmailConfig,
  token: string
): Promise<EmailMessage[]> {
  let filter = "hasAttachments eq true and isRead eq false";
  if (!config.check_all_messages && config.last_check) {
    filter += ` and receivedDateTime gt ${new Date(config.last_check).toISOString()}`;
  }
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${config.monitored_email}/mailFolders/Inbox/messages?$filter=${encodeURIComponent(filter)}&$select=id,subject,from,receivedDateTime,hasAttachments`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Office365 fetch emails failed: ${errText}`);
  }
  const data = await resp.json();
  return (data.value || []).map((e: any) => ({
    id: e.id,
    subject: e.subject || "",
    from: e.from?.emailAddress?.address || "",
    receivedDate: e.receivedDateTime || "",
  }));
}

async function office365FindPdfs(
  config: ImagingEmailConfig,
  token: string,
  emailId: string
): Promise<PdfAttachment[]> {
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${config.monitored_email}/messages/${emailId}/attachments`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  const pdfs: PdfAttachment[] = [];
  for (const att of data.value || []) {
    if (att.name?.toLowerCase().endsWith(".pdf") && att.contentBytes) {
      const pageCount = await getPdfPageCount(att.contentBytes);
      pdfs.push({ filename: att.name, base64: att.contentBytes, pageCount });
    }
  }
  return pdfs;
}

async function office365PostProcess(
  config: ImagingEmailConfig,
  token: string,
  emailId: string,
  action: string,
  folderPath: string
): Promise<void> {
  if (action === "none") return;
  const baseUrl = `https://graph.microsoft.com/v1.0/users/${config.monitored_email}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (action === "mark_read" || action === "move" || action === "archive") {
    await fetch(`${baseUrl}/messages/${emailId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isRead: true }),
    });
  }

  if (action === "move" || action === "archive" || action === "delete") {
    const foldersResp = await fetch(`${baseUrl}/mailFolders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const foldersData = await foldersResp.json();
    const folders = foldersData.value || [];

    let targetFolderId: string | null = null;
    if (action === "move") {
      let f = folders.find((f: any) => f.displayName === folderPath);
      if (!f) {
        const cr = await fetch(`${baseUrl}/mailFolders`, {
          method: "POST",
          headers,
          body: JSON.stringify({ displayName: folderPath }),
        });
        if (cr.ok) f = await cr.json();
      }
      targetFolderId = f?.id || null;
    } else if (action === "archive") {
      targetFolderId =
        folders.find((f: any) => f.displayName === "Archive")?.id || null;
    } else if (action === "delete") {
      targetFolderId =
        folders.find((f: any) => f.displayName === "Deleted Items")?.id || null;
    }

    if (targetFolderId) {
      await fetch(`${baseUrl}/messages/${emailId}/move`, {
        method: "POST",
        headers,
        body: JSON.stringify({ destinationId: targetFolderId }),
      });
    }
  }
}

async function gmailAuthenticate(
  config: ImagingEmailConfig
): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.gmail_client_id || "",
      client_secret: config.gmail_client_secret || "",
      refresh_token: config.gmail_refresh_token || "",
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gmail auth failed: ${errText}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function gmailFetchEmails(
  config: ImagingEmailConfig,
  token: string
): Promise<EmailMessage[]> {
  let query = "has:attachment is:unread";
  if (
    config.gmail_monitored_label &&
    config.gmail_monitored_label !== "INBOX"
  ) {
    query += ` label:${config.gmail_monitored_label}`;
  } else {
    query += " in:inbox";
  }
  if (!config.check_all_messages && config.last_check) {
    const ts = Math.floor(new Date(config.last_check).getTime() / 1000);
    query += ` after:${ts}`;
  }

  const resp = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gmail fetch emails failed: ${errText}`);
  }
  const data = await resp.json();
  const messages = data.messages || [];

  const results: EmailMessage[] = [];
  for (const m of messages) {
    const detailResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (detailResp.ok) {
      const detail = await detailResp.json();
      const hdrs = detail.payload?.headers || [];
      results.push({
        id: m.id,
        subject:
          hdrs.find((h: any) => h.name === "Subject")?.value || "",
        from: hdrs.find((h: any) => h.name === "From")?.value || "",
        receivedDate:
          hdrs.find((h: any) => h.name === "Date")?.value || "",
      });
    } else {
      results.push({ id: m.id, subject: "", from: "", receivedDate: "" });
    }
  }
  return results;
}

async function gmailFindPdfs(
  token: string,
  emailId: string
): Promise<PdfAttachment[]> {
  const resp = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) return [];
  const msgData = await resp.json();
  const attachments: { filename: string; attachmentId: string }[] = [];

  const findAtts = (part: any) => {
    if (part.parts) part.parts.forEach(findAtts);
    else if (
      part.filename?.toLowerCase().endsWith(".pdf") &&
      part.body?.attachmentId
    ) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
      });
    }
  };
  findAtts(msgData.payload);

  const pdfs: PdfAttachment[] = [];
  for (const att of attachments) {
    const attResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${att.attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (attResp.ok) {
      const attData = await attResp.json();
      const base64 = attData.data.replace(/-/g, "+").replace(/_/g, "/");
      const pageCount = await getPdfPageCount(base64);
      pdfs.push({ filename: att.filename, base64, pageCount });
    }
  }
  return pdfs;
}

async function gmailPostProcess(
  token: string,
  emailId: string,
  action: string,
  folderPath: string
): Promise<void> {
  if (action === "none") return;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (action === "mark_read" || action === "move" || action === "archive") {
    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      }
    );
  }

  if (action === "move") {
    const labelsResp = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/labels",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (labelsResp.ok) {
      const labelsData = await labelsResp.json();
      let label = labelsData.labels?.find(
        (l: any) => l.name === folderPath
      );
      if (!label) {
        const cr = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/labels",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: folderPath,
              labelListVisibility: "labelShow",
              messageListVisibility: "show",
            }),
          }
        );
        if (cr.ok) label = await cr.json();
      }
      if (label) {
        await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              addLabelIds: [label.id],
              removeLabelIds: ["INBOX"],
            }),
          }
        );
      }
    }
  }

  if (action === "archive") {
    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ removeLabelIds: ["INBOX", "UNREAD"] }),
      }
    );
  }

  if (action === "delete") {
    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/trash`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from("imaging_email_monitoring_config")
      .select("*")
      .maybeSingle();

    if (configError) throw configError;

    if (!config || !config.is_enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Imaging email monitoring is disabled or not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.imaging_bucket_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No imaging bucket configured",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Imaging email monitor started, provider: ${config.provider}`
    );

    let accessToken: string;
    if (config.provider === "gmail") {
      accessToken = await gmailAuthenticate(config);
    } else {
      accessToken = await office365Authenticate(config);
    }

    let emails: EmailMessage[];
    if (config.provider === "gmail") {
      emails = await gmailFetchEmails(config, accessToken);
    } else {
      emails = await office365FetchEmails(config, accessToken);
    }

    console.log(`Found ${emails.length} emails with attachments`);

    let processedCount = 0;
    let indexedCount = 0;
    let unindexedCount = 0;
    let errorCount = 0;

    for (const email of emails) {
      let emailSuccess = true;
      try {
        let pdfs: PdfAttachment[];
        if (config.provider === "gmail") {
          pdfs = await gmailFindPdfs(accessToken, email.id);
        } else {
          pdfs = await office365FindPdfs(config, accessToken, email.id);
        }

        console.log(
          `Email "${email.subject}" from ${email.from}: ${pdfs.length} PDF(s)`
        );

        for (const pdf of pdfs) {
          try {
            const processorResp = await fetch(
              `${supabaseUrl}/functions/v1/imaging-sftp-processor`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  pdfBase64: pdf.base64,
                  originalFilename: pdf.filename,
                  fileSize: pdf.base64.length,
                  bucketId: config.imaging_bucket_id,
                  emailConfigId: config.id,
                  sourceType: "email",
                }),
              }
            );

            if (processorResp.ok) {
              const result = await processorResp.json();
              if (result.indexed) {
                indexedCount++;
              } else {
                unindexedCount++;
              }
              processedCount++;
            } else {
              const errText = await processorResp.text();
              console.error(
                `Processor failed for ${pdf.filename}: ${errText}`
              );
              errorCount++;
              emailSuccess = false;
            }
          } catch (pdfErr) {
            console.error(
              `Error processing PDF ${pdf.filename}:`,
              pdfErr
            );
            errorCount++;
            emailSuccess = false;
          }
        }
      } catch (emailErr) {
        console.error(`Error processing email ${email.id}:`, emailErr);
        errorCount++;
        emailSuccess = false;
      }

      try {
        const action = emailSuccess
          ? config.post_process_action || "mark_read"
          : config.post_process_action_on_failure || "none";
        const folder = emailSuccess
          ? config.processed_folder_path || "Processed"
          : config.failure_folder_path || "Failed";

        if (config.provider === "gmail") {
          await gmailPostProcess(accessToken, email.id, action, folder);
        } else {
          await office365PostProcess(
            config,
            accessToken,
            email.id,
            action,
            folder
          );
        }
      } catch (ppErr) {
        console.warn("Post-process action failed:", ppErr);
      }
    }

    await supabase
      .from("imaging_email_monitoring_config")
      .update({ last_check: new Date().toISOString() })
      .eq("id", config.id);

    await supabase.from("email_polling_logs").insert({
      provider: config.provider,
      status: errorCount > 0 ? "partial" : "success",
      emails_found: emails.length,
      emails_processed: processedCount,
      emails_failed: errorCount,
      error_message:
        errorCount > 0
          ? `${errorCount} PDF(s) failed processing`
          : null,
    });

    const summary = {
      success: true,
      emailsFound: emails.length,
      pdfsProcessed: processedCount,
      indexed: indexedCount,
      unindexed: unindexedCount,
      errors: errorCount,
    };

    console.log("Imaging email monitor completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Imaging email monitor error:", error);
    return new Response(
      JSON.stringify({
        error: "Imaging email monitor failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

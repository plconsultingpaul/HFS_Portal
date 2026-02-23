import { getValueByPath } from "../utils.ts";

export async function executeImaging(
  step: any,
  contextData: any,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<any> {
  console.log("=== EXECUTING IMAGING STEP ===");
  const config = step.config_json || {};
  const mode = config.imagingMode || "put";
  console.log("Imaging mode:", mode);

  const resolveTemplate = (template: string): string => {
    if (!template) return "";
    return template.replace(/\{\{([^}]+)\}\}/g, (_match: string, path: string) => {
      const value = getValueByPath(contextData, path);
      return value !== null && value !== undefined ? String(value) : "";
    });
  };

  const detailLineId = resolveTemplate(config.detailLineId || "");
  const bucketId = config.bucketId || "";
  const documentTypeId = config.documentTypeId || "";

  if (!bucketId || !documentTypeId || !detailLineId) {
    throw new Error(
      `Imaging step missing required fields. bucketId: ${bucketId}, documentTypeId: ${documentTypeId}, detailLineId: ${detailLineId}`
    );
  }

  const payload: any = {
    action: mode,
    bucketId,
    documentTypeId,
    detailLineId,
  };

  if (mode === "put") {
    payload.billNumber = resolveTemplate(config.billNumber || "");
    payload.pdfBase64 = contextData.pdfBase64 || "";
    payload.originalFilename =
      contextData.renamedPdfFilename ||
      contextData.pdfFilename ||
      contextData.originalPdfFilename ||
      "";
    payload.storagePath = config.storagePath
      ? resolveTemplate(config.storagePath)
      : undefined;
  }

  console.log("Imaging payload (excluding pdfBase64):", {
    ...payload,
    pdfBase64: payload.pdfBase64 ? `[${payload.pdfBase64.length} chars]` : "none",
  });

  const resp = await fetch(`${supabaseUrl}/functions/v1/imaging-proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      apikey: supabaseServiceKey,
    },
    body: JSON.stringify(payload),
  });

  const result = await resp.json();

  if (!resp.ok) {
    throw new Error(
      `Imaging ${mode} failed: ${result.error || resp.statusText}`
    );
  }

  console.log("Imaging result:", result);

  if (result.documentUrl) {
    contextData.imagingDocumentUrl = result.documentUrl;
  }
  if (result.documentId) {
    contextData.imagingDocumentId = result.documentId;
  }
  if (result.storagePath) {
    contextData.imagingStoragePath = result.storagePath;
  }

  return result;
}

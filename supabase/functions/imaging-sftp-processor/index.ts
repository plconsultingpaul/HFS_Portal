import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BarcodePattern {
  id: string;
  pattern_template: string;
  separator: string;
  fixed_document_type: string | null;
  bucket_id: string;
  priority: number;
}

interface MatchResult {
  documentType: string;
  detailLineId: string;
  bucketId: string;
  patternId: string;
}

function matchBarcodeToPattern(
  barcode: string,
  pattern: BarcodePattern,
  documentTypeNames: string[]
): MatchResult | null {
  const sep = pattern.separator || "-";
  const template = pattern.pattern_template;
  const parts = barcode.split(sep);

  if (parts.length < 2) return null;

  const templateParts = template.split(sep);

  if (pattern.fixed_document_type) {
    const expectedPrefix = pattern.fixed_document_type;
    if (parts[0] !== expectedPrefix) return null;
    const detailLineId = parts.slice(1).join(sep);
    if (!detailLineId) return null;
    return {
      documentType: expectedPrefix,
      detailLineId,
      bucketId: pattern.bucket_id,
      patternId: pattern.id,
    };
  }

  const docTypeIdx = templateParts.indexOf("{documentType}");
  const detailIdx = templateParts.indexOf("{detailLineId}");

  if (docTypeIdx === -1 || detailIdx === -1) return null;
  if (parts.length < Math.max(docTypeIdx, detailIdx) + 1) return null;

  const docType = parts[docTypeIdx];
  const detailLineId =
    detailIdx === templateParts.length - 1
      ? parts.slice(detailIdx).join(sep)
      : parts[detailIdx];

  if (!docType || !detailLineId) return null;

  const matchesKnownType = documentTypeNames.some(
    (name) => name.toLowerCase() === docType.toLowerCase()
  );
  if (!matchesKnownType) return null;

  return {
    documentType: docType,
    detailLineId,
    bucketId: pattern.bucket_id,
    patternId: pattern.id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      pdfBase64,
      originalFilename,
      fileSize,
      bucketId,
      sftpConfigId,
      emailConfigId,
      sourceType,
    } = await req.json();

    if (!pdfBase64 || !bucketId) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 and bucketId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: geminiKeys } = await supabase
      .from("gemini_api_keys")
      .select("id, api_key")
      .eq("is_active", true)
      .limit(1);

    if (!geminiKeys || geminiKeys.length === 0 || !geminiKeys[0].api_key) {
      return new Response(
        JSON.stringify({ error: "No active Gemini API key configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = geminiKeys[0].api_key;
    let modelName = "gemini-2.5-pro";

    const { data: modelData } = await supabase
      .from("gemini_models")
      .select("model_name")
      .eq("api_key_id", geminiKeys[0].id)
      .eq("is_active", true)
      .maybeSingle();

    if (modelData?.model_name) {
      modelName = modelData.model_name;
    }

    const { data: patterns } = await supabase
      .from("imaging_barcode_patterns")
      .select("*")
      .eq("is_active", true)
      .order("priority");

    const activePatterns: BarcodePattern[] = patterns || [];

    const { data: docTypes } = await supabase
      .from("imaging_document_types")
      .select("id, name")
      .eq("is_active", true);

    const documentTypeNames = (docTypes || []).map((dt: any) => dt.name);
    const documentTypeMap = new Map(
      (docTypes || []).map((dt: any) => [dt.name.toLowerCase(), dt.id])
    );

    console.log(`Scanning PDF for barcodes: ${originalFilename || "unknown"}`);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Analyze this PDF document and find ALL barcodes (1D and 2D including QR codes, Code 128, Code 39, etc.) visible on any page.

For each barcode found, return its decoded text value.

Return ONLY a JSON array of strings with the barcode values. If no barcodes are found, return an empty array [].

Example response: ["BOL-12345", "Invoice-67890", "POD-11111"]

Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent([
      { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
      prompt,
    ]);

    const responseText = result.response.text().trim();
    let detectedBarcodes: string[] = [];

    try {
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        detectedBarcodes = parsed.filter(
          (v: any) => typeof v === "string" && v.length > 0
        );
      }
    } catch {
      console.warn("Failed to parse Gemini barcode response:", responseText);
    }

    console.log(
      `Detected ${detectedBarcodes.length} barcodes:`,
      detectedBarcodes
    );

    const storagePath = `imaging/${Date.now()}-${originalFilename || "document.pdf"}`;

    let matchResult: MatchResult | null = null;

    for (const barcode of detectedBarcodes) {
      for (const pattern of activePatterns) {
        const result = matchBarcodeToPattern(
          barcode,
          pattern,
          documentTypeNames
        );
        if (result) {
          matchResult = result;
          break;
        }
      }
      if (matchResult) break;
    }

    if (matchResult) {
      const docTypeId = documentTypeMap.get(
        matchResult.documentType.toLowerCase()
      );

      if (!docTypeId) {
        console.warn(
          `Matched document type "${matchResult.documentType}" not found in imaging_document_types`
        );

        const { error: queueError } = await supabase
          .from("imaging_unindexed_queue")
          .insert({
            bucket_id: bucketId,
            storage_path: storagePath,
            original_filename: originalFilename || "",
            file_size: fileSize || 0,
            detected_barcodes: detectedBarcodes,
            source_sftp_config_id: sftpConfigId || null,
            source_email_config_id: emailConfigId || null,
            source_type: sourceType || 'sftp',
            status: "pending",
          });

        if (queueError) {
          console.error("Failed to queue unindexed item:", queueError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            indexed: false,
            reason: `Document type "${matchResult.documentType}" not found in configuration`,
            detectedBarcodes,
            storagePath,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(
        `Barcode match found: type=${matchResult.documentType}, detailLineId=${matchResult.detailLineId}`
      );

      const { error: docError } = await supabase
        .from("imaging_documents")
        .insert({
          bucket_id: matchResult.bucketId,
          document_type_id: docTypeId,
          detail_line_id: matchResult.detailLineId,
          bill_number: "",
          storage_path: storagePath,
          original_filename: originalFilename || "",
          file_size: fileSize || 0,
        });

      if (docError) {
        console.error("Failed to create imaging document:", docError);
        throw docError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          indexed: true,
          documentType: matchResult.documentType,
          detailLineId: matchResult.detailLineId,
          detectedBarcodes,
          storagePath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("No matching barcode pattern found, adding to unindexed queue");

    const { error: queueError } = await supabase
      .from("imaging_unindexed_queue")
      .insert({
        bucket_id: bucketId,
        storage_path: storagePath,
        original_filename: originalFilename || "",
        file_size: fileSize || 0,
        detected_barcodes: detectedBarcodes,
        source_sftp_config_id: sftpConfigId || null,
        status: "pending",
      });

    if (queueError) {
      console.error("Failed to queue unindexed item:", queueError);
      throw queueError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        indexed: false,
        reason:
          detectedBarcodes.length === 0
            ? "No barcodes detected in document"
            : "No barcode matched configured patterns",
        detectedBarcodes,
        storagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Imaging SFTP processor error:", error);
    return new Response(
      JSON.stringify({
        error: "Imaging processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

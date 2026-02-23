import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, bucketId, documentTypeId, detailLineId, billNumber, pdfBase64, originalFilename, storagePath } = body;

    const dbHeaders = {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      "apikey": supabaseServiceKey,
    };

    if (action === "put") {
      if (!bucketId || !documentTypeId || !detailLineId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: bucketId, documentTypeId, detailLineId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bucketResp = await fetch(
        `${supabaseUrl}/rest/v1/imaging_buckets?id=eq.${bucketId}`,
        { headers: dbHeaders }
      );
      const buckets = await bucketResp.json();
      if (!buckets || buckets.length === 0) {
        return new Response(
          JSON.stringify({ error: `Bucket not found: ${bucketId}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const bucket = buckets[0];

      const docTypeResp = await fetch(
        `${supabaseUrl}/rest/v1/imaging_document_types?id=eq.${documentTypeId}`,
        { headers: dbHeaders }
      );
      const docTypes = await docTypeResp.json();
      if (!docTypes || docTypes.length === 0) {
        return new Response(
          JSON.stringify({ error: `Document type not found: ${documentTypeId}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const docType = docTypes[0];

      const finalStoragePath = storagePath || `${docType.name}/${detailLineId}_${Date.now()}.pdf`;
      const fileSize = pdfBase64 ? Math.round((pdfBase64.length * 3) / 4) : 0;

      const docRecord = {
        bucket_id: bucketId,
        document_type_id: documentTypeId,
        detail_line_id: detailLineId,
        bill_number: billNumber || "",
        storage_path: finalStoragePath,
        original_filename: originalFilename || "",
        file_size: fileSize,
      };

      const insertResp = await fetch(`${supabaseUrl}/rest/v1/imaging_documents`, {
        method: "POST",
        headers: { ...dbHeaders, "Prefer": "return=representation" },
        body: JSON.stringify(docRecord),
      });

      if (!insertResp.ok) {
        const errText = await insertResp.text();
        return new Response(
          JSON.stringify({ error: "Failed to create imaging document record", details: errText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const insertedDocs = await insertResp.json();
      const insertedDoc = Array.isArray(insertedDocs) ? insertedDocs[0] : insertedDocs;

      const documentUrl = `${bucket.url.replace(/\/$/, "")}/${finalStoragePath}`;

      return new Response(
        JSON.stringify({
          success: true,
          action: "put",
          documentId: insertedDoc.id,
          storagePath: finalStoragePath,
          documentUrl,
          bucketName: bucket.name,
          documentTypeName: docType.name,
          detailLineId,
          billNumber: billNumber || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      if (!bucketId || !documentTypeId || !detailLineId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: bucketId, documentTypeId, detailLineId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bucketResp = await fetch(
        `${supabaseUrl}/rest/v1/imaging_buckets?id=eq.${bucketId}`,
        { headers: dbHeaders }
      );
      const buckets = await bucketResp.json();
      if (!buckets || buckets.length === 0) {
        return new Response(
          JSON.stringify({ error: `Bucket not found: ${bucketId}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const bucket = buckets[0];

      const searchResp = await fetch(
        `${supabaseUrl}/rest/v1/imaging_documents?bucket_id=eq.${bucketId}&document_type_id=eq.${documentTypeId}&detail_line_id=eq.${encodeURIComponent(detailLineId)}&order=created_at.desc&limit=1`,
        { headers: dbHeaders }
      );
      const docs = await searchResp.json();

      if (!docs || docs.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            action: "get",
            error: "Document not found",
            detailLineId,
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const doc = docs[0];
      const documentUrl = `${bucket.url.replace(/\/$/, "")}/${doc.storage_path}`;

      return new Response(
        JSON.stringify({
          success: true,
          action: "get",
          documentId: doc.id,
          storagePath: doc.storage_path,
          documentUrl,
          bucketName: bucket.name,
          detailLineId: doc.detail_line_id,
          billNumber: doc.bill_number,
          originalFilename: doc.original_filename,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}. Expected 'put' or 'get'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Imaging proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

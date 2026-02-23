import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_TABLES = [
  "extraction_logs",
  "workflow_execution_logs",
  "email_polling_logs",
  "processed_emails",
  "sftp_polling_logs",
  "driver_checkin_logs",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const TABLE_DATE_COLUMN: Record<AllowedTable, string> = {
  extraction_logs: "created_at",
  workflow_execution_logs: "created_at",
  email_polling_logs: "created_at",
  processed_emails: "processed_at",
  sftp_polling_logs: "created_at",
  driver_checkin_logs: "created_at",
};

const CHILD_TABLES: Partial<
  Record<AllowedTable, { table: string; fk: string; parentPk: string }>
> = {
  workflow_execution_logs: {
    table: "workflow_step_logs",
    fk: "workflow_execution_log_id",
    parentPk: "id",
  },
  driver_checkin_logs: {
    table: "driver_checkin_documents",
    fk: "checkin_log_id",
    parentPk: "id",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerToken = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${callerToken}` } } }
    );
    const { data: { user: caller }, error: callerError } = await authClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { logTypes, retentionDays } = await req.json();

    if (
      !Array.isArray(logTypes) ||
      logTypes.length === 0 ||
      typeof retentionDays !== "number" ||
      retentionDays < 1
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid request. Provide logTypes array and retentionDays.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validTypes = logTypes.filter((t: string) =>
      ALLOWED_TABLES.includes(t as AllowedTable)
    ) as AllowedTable[];

    if (validTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid log types provided." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const deleted: Record<string, number> = {};

    for (const table of validTypes) {
      const dateCol = TABLE_DATE_COLUMN[table];
      const child = CHILD_TABLES[table];

      if (child) {
        const { data: parentRows } = await supabase
          .from(table)
          .select(child.parentPk)
          .lt(dateCol, cutoffIso);

        if (parentRows && parentRows.length > 0) {
          const parentIds = parentRows.map(
            (r: Record<string, string>) => r[child.parentPk]
          );

          await supabase.from(child.table).delete().in(child.fk, parentIds);
        }
      }

      const { data, error } = await supabase
        .from(table)
        .delete()
        .lt(dateCol, cutoffIso)
        .select("id");

      if (error) {
        console.error(`Error purging ${table}:`, error);
        deleted[table] = -1;
      } else {
        deleted[table] = data?.length ?? 0;
      }
    }

    return new Response(JSON.stringify({ success: true, deleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Purge logs error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

# RLS Step 4: Execute Buttons, Order Entry & Track/Trace Configuration

**Date:** 2026-02-07
**Migration file:** `step4_tighten_rls_execute_order_entry_track_trace`

## Summary

Replaced wide-open RLS policies on 38 feature configuration tables across execute buttons, order entry, and track & trace. All tables follow the same pattern: authenticated users can read, only admins can write. No frontend code changes were needed.

## Tables Changed (38 total)

### Execute Buttons (10 tables)

| Table | Old Policy | New Policy |
|---|---|---|
| `execute_buttons` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_groups` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_steps` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_categories` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_category_assignments` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_flow_nodes` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_flow_edges` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `execute_button_global_settings` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `user_execute_category_access` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |

### Order Entry (9 tables)

| Table | Old Policy | New Policy |
|---|---|---|
| `order_entry_config` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_field_groups` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_field_layout` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_templates` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_template_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_template_field_groups` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_template_field_layout` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `order_entry_json_schemas` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |

### Track & Trace (19 tables)

| Table | Old Policy | New Policy |
|---|---|---|
| `track_trace_configs` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_templates` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_template_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_template_default_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_template_sections` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_filter_presets` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_document_configs` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_document_filters` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_barcode_configs` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_barcode_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_barcode_image_configs` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_timeline_statuses` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_timeline_child_statuses` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_route_summary_groups` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_route_summary_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_shipment_summary_config` | SELECT + FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_shipment_summary_fields` | SELECT + FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `track_trace_shipment_summary_groups` | SELECT + FOR ALL (USING true) | SELECT: authenticated; writes: admin |

## Policies Removed

- ~149 wide-open policies total (mix of public FOR ALL, per-command public, anon+authenticated with USING true)

## Policies Added

- 152 new targeted policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
- All 38 tables: SELECT open to any authenticated user, writes require admin

## Frontend Files Changed

None. All access to these tables already happens within authenticated sessions. Edge functions use the service role key and bypass RLS.

## What To Test

1. **Execute page** -- buttons load, modals open, flows execute
2. **Execute setup** -- create, edit, delete buttons; configure flow designer; manage categories
3. **Order entry** -- form loads, PDF upload, submission works
4. **Order entry config** -- templates, fields, field groups, layout, JSON schemas
5. **Track & trace** -- search works, results display, shipment details load
6. **Track & trace config** -- templates, fields, filter presets, document configs, barcode configs, timeline statuses, route summary, shipment summary
7. **Client portal** -- track & trace and order entry still functional for non-admin users (read access preserved)

/*
  # Step 4: Tighten RLS on Execute Buttons, Order Entry & Track/Trace Configuration

  Replaces wide-open policies on 38 feature configuration tables.
  All tables get the same pattern:
    - SELECT: any authenticated user
    - INSERT/UPDATE/DELETE: authenticated + is_admin()

  ## Tables Modified (38 total)

  ### Execute Buttons (10 tables)
    - `execute_buttons` (4 public policies removed)
    - `execute_button_fields` (4 public policies removed)
    - `execute_button_groups` (4 public policies removed)
    - `execute_button_steps` (4 public policies removed)
    - `execute_button_categories` (4 anon+auth policies removed)
    - `execute_button_category_assignments` (4 anon+auth policies removed)
    - `execute_button_flow_nodes` (4 public policies removed)
    - `execute_button_flow_edges` (4 public policies removed)
    - `execute_button_global_settings` (4 public policies removed)
    - `user_execute_category_access` (4 anon+auth policies removed)

  ### Order Entry (9 tables)
    - `order_entry_config` (4 public policies removed)
    - `order_entry_fields` (4 public policies removed)
    - `order_entry_field_groups` (4 public policies removed)
    - `order_entry_field_layout` (4 public policies removed)
    - `order_entry_templates` (4 public policies removed)
    - `order_entry_template_fields` (4 public policies removed)
    - `order_entry_template_field_groups` (4 public policies removed)
    - `order_entry_template_field_layout` (4 public policies removed)
    - `order_entry_json_schemas` (4 public policies removed)

  ### Track & Trace (19 tables)
    - `track_trace_configs` (4 public policies removed)
    - `track_trace_fields` (4 public policies removed)
    - `track_trace_templates` (4 public policies removed)
    - `track_trace_template_fields` (4 public policies removed)
    - `track_trace_template_default_fields` (4 public policies removed)
    - `track_trace_template_sections` (4 public policies removed)
    - `track_trace_filter_presets` (4 public policies removed)
    - `track_trace_document_configs` (4 public policies removed)
    - `track_trace_document_filters` (4 public policies removed)
    - `track_trace_barcode_configs` (4 public policies removed)
    - `track_trace_barcode_fields` (4 public policies removed)
    - `track_trace_barcode_image_configs` (4 public policies removed)
    - `track_trace_timeline_statuses` (4 public policies removed)
    - `track_trace_timeline_child_statuses` (4 public policies removed)
    - `track_trace_route_summary_groups` (4 public policies removed)
    - `track_trace_route_summary_fields` (4 public policies removed)
    - `track_trace_shipment_summary_config` (SELECT + FOR ALL removed)
    - `track_trace_shipment_summary_fields` (SELECT + FOR ALL removed)
    - `track_trace_shipment_summary_groups` (SELECT + FOR ALL removed)

  ## Security Changes
    - Every table: SELECT requires authenticated role
    - Every table: INSERT/UPDATE/DELETE requires authenticated + is_admin()
    - Anonymous users lose all access
    - Edge functions (service role) are unaffected
*/

-- ============================================================
-- EXECUTE BUTTONS (10 tables)
-- ============================================================

-- execute_buttons
DROP POLICY IF EXISTS "Allow public read access to execute_buttons" ON execute_buttons;
DROP POLICY IF EXISTS "Allow public insert access to execute_buttons" ON execute_buttons;
DROP POLICY IF EXISTS "Allow public update access to execute_buttons" ON execute_buttons;
DROP POLICY IF EXISTS "Allow public delete access to execute_buttons" ON execute_buttons;

CREATE POLICY "Authenticated can select execute_buttons"
  ON execute_buttons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_buttons"
  ON execute_buttons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_buttons"
  ON execute_buttons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_buttons"
  ON execute_buttons FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_fields
DROP POLICY IF EXISTS "Allow public read access to execute_button_fields" ON execute_button_fields;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_fields" ON execute_button_fields;
DROP POLICY IF EXISTS "Allow public update access to execute_button_fields" ON execute_button_fields;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_fields" ON execute_button_fields;

CREATE POLICY "Authenticated can select execute_button_fields"
  ON execute_button_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_fields"
  ON execute_button_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_fields"
  ON execute_button_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_fields"
  ON execute_button_fields FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_groups
DROP POLICY IF EXISTS "Allow public read access to execute_button_groups" ON execute_button_groups;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_groups" ON execute_button_groups;
DROP POLICY IF EXISTS "Allow public update access to execute_button_groups" ON execute_button_groups;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_groups" ON execute_button_groups;

CREATE POLICY "Authenticated can select execute_button_groups"
  ON execute_button_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_groups"
  ON execute_button_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_groups"
  ON execute_button_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_groups"
  ON execute_button_groups FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_steps
DROP POLICY IF EXISTS "Allow public read access to email processing rules" ON execute_button_steps;
DROP POLICY IF EXISTS "Allow public insert access to email processing rules" ON execute_button_steps;
DROP POLICY IF EXISTS "Allow public update access to email processing rules" ON execute_button_steps;
DROP POLICY IF EXISTS "Allow public delete access to email processing rules" ON execute_button_steps;

CREATE POLICY "Authenticated can select execute_button_steps"
  ON execute_button_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_steps"
  ON execute_button_steps FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_steps"
  ON execute_button_steps FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_steps"
  ON execute_button_steps FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_categories
DROP POLICY IF EXISTS "Allow public read access to execute_button_categories" ON execute_button_categories;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_categories" ON execute_button_categories;
DROP POLICY IF EXISTS "Allow public update access to execute_button_categories" ON execute_button_categories;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_categories" ON execute_button_categories;

CREATE POLICY "Authenticated can select execute_button_categories"
  ON execute_button_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_categories"
  ON execute_button_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_categories"
  ON execute_button_categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_categories"
  ON execute_button_categories FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_category_assignments
DROP POLICY IF EXISTS "Allow public read access to execute_button_category_assignments" ON execute_button_category_assignments;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_category_assignmen" ON execute_button_category_assignments;
DROP POLICY IF EXISTS "Allow public update access to execute_button_category_assignmen" ON execute_button_category_assignments;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_category_assignmen" ON execute_button_category_assignments;

CREATE POLICY "Authenticated can select execute_button_category_assignments"
  ON execute_button_category_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_category_assignments"
  ON execute_button_category_assignments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_category_assignments"
  ON execute_button_category_assignments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_category_assignments"
  ON execute_button_category_assignments FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_flow_nodes
DROP POLICY IF EXISTS "Allow public read access to execute_button_flow_nodes" ON execute_button_flow_nodes;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_flow_nodes" ON execute_button_flow_nodes;
DROP POLICY IF EXISTS "Allow public update access to execute_button_flow_nodes" ON execute_button_flow_nodes;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_flow_nodes" ON execute_button_flow_nodes;

CREATE POLICY "Authenticated can select execute_button_flow_nodes"
  ON execute_button_flow_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_flow_nodes"
  ON execute_button_flow_nodes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_flow_nodes"
  ON execute_button_flow_nodes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_flow_nodes"
  ON execute_button_flow_nodes FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_flow_edges
DROP POLICY IF EXISTS "Allow public read access to execute_button_flow_edges" ON execute_button_flow_edges;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_flow_edges" ON execute_button_flow_edges;
DROP POLICY IF EXISTS "Allow public update access to execute_button_flow_edges" ON execute_button_flow_edges;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_flow_edges" ON execute_button_flow_edges;

CREATE POLICY "Authenticated can select execute_button_flow_edges"
  ON execute_button_flow_edges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_flow_edges"
  ON execute_button_flow_edges FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_flow_edges"
  ON execute_button_flow_edges FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_flow_edges"
  ON execute_button_flow_edges FOR DELETE TO authenticated USING (public.is_admin());

-- execute_button_global_settings
DROP POLICY IF EXISTS "Allow public read access to execute_button_global_settings" ON execute_button_global_settings;
DROP POLICY IF EXISTS "Allow public insert access to execute_button_global_settings" ON execute_button_global_settings;
DROP POLICY IF EXISTS "Allow public update access to execute_button_global_settings" ON execute_button_global_settings;
DROP POLICY IF EXISTS "Allow public delete access to execute_button_global_settings" ON execute_button_global_settings;

CREATE POLICY "Authenticated can select execute_button_global_settings"
  ON execute_button_global_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert execute_button_global_settings"
  ON execute_button_global_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update execute_button_global_settings"
  ON execute_button_global_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete execute_button_global_settings"
  ON execute_button_global_settings FOR DELETE TO authenticated USING (public.is_admin());

-- user_execute_category_access
DROP POLICY IF EXISTS "Allow public read access to user_execute_category_access" ON user_execute_category_access;
DROP POLICY IF EXISTS "Allow public insert access to user_execute_category_access" ON user_execute_category_access;
DROP POLICY IF EXISTS "Allow public update access to user_execute_category_access" ON user_execute_category_access;
DROP POLICY IF EXISTS "Allow public delete access to user_execute_category_access" ON user_execute_category_access;

CREATE POLICY "Authenticated can select user_execute_category_access"
  ON user_execute_category_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_execute_category_access"
  ON user_execute_category_access FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update user_execute_category_access"
  ON user_execute_category_access FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete user_execute_category_access"
  ON user_execute_category_access FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- ORDER ENTRY (9 tables)
-- ============================================================

-- order_entry_config
DROP POLICY IF EXISTS "Allow public read access to order entry config" ON order_entry_config;
DROP POLICY IF EXISTS "Allow public insert access to order entry config" ON order_entry_config;
DROP POLICY IF EXISTS "Allow public update access to order entry config" ON order_entry_config;
DROP POLICY IF EXISTS "Allow public delete access to order entry config" ON order_entry_config;

CREATE POLICY "Authenticated can select order_entry_config"
  ON order_entry_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_config"
  ON order_entry_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_config"
  ON order_entry_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_config"
  ON order_entry_config FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_fields
DROP POLICY IF EXISTS "Allow public read access to fields" ON order_entry_fields;
DROP POLICY IF EXISTS "Allow public insert access to fields" ON order_entry_fields;
DROP POLICY IF EXISTS "Allow public update access to fields" ON order_entry_fields;
DROP POLICY IF EXISTS "Allow public delete access to fields" ON order_entry_fields;

CREATE POLICY "Authenticated can select order_entry_fields"
  ON order_entry_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_fields"
  ON order_entry_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_fields"
  ON order_entry_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_fields"
  ON order_entry_fields FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_field_groups
DROP POLICY IF EXISTS "Allow public read access to field groups" ON order_entry_field_groups;
DROP POLICY IF EXISTS "Allow public insert access to field groups" ON order_entry_field_groups;
DROP POLICY IF EXISTS "Allow public update access to field groups" ON order_entry_field_groups;
DROP POLICY IF EXISTS "Allow public delete access to field groups" ON order_entry_field_groups;

CREATE POLICY "Authenticated can select order_entry_field_groups"
  ON order_entry_field_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_field_groups"
  ON order_entry_field_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_field_groups"
  ON order_entry_field_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_field_groups"
  ON order_entry_field_groups FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_field_layout
DROP POLICY IF EXISTS "Allow public read access to field layout" ON order_entry_field_layout;
DROP POLICY IF EXISTS "Allow public insert access to field layout" ON order_entry_field_layout;
DROP POLICY IF EXISTS "Allow public update access to field layout" ON order_entry_field_layout;
DROP POLICY IF EXISTS "Allow public delete access to field layout" ON order_entry_field_layout;

CREATE POLICY "Authenticated can select order_entry_field_layout"
  ON order_entry_field_layout FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_field_layout"
  ON order_entry_field_layout FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_field_layout"
  ON order_entry_field_layout FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_field_layout"
  ON order_entry_field_layout FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_templates
DROP POLICY IF EXISTS "Allow public read access to order_entry_templates" ON order_entry_templates;
DROP POLICY IF EXISTS "Allow public insert access to order_entry_templates" ON order_entry_templates;
DROP POLICY IF EXISTS "Allow public update access to order_entry_templates" ON order_entry_templates;
DROP POLICY IF EXISTS "Allow public delete access to order_entry_templates" ON order_entry_templates;

CREATE POLICY "Authenticated can select order_entry_templates"
  ON order_entry_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_templates"
  ON order_entry_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_templates"
  ON order_entry_templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_templates"
  ON order_entry_templates FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_template_fields
DROP POLICY IF EXISTS "Allow public read access to order_entry_template_fields" ON order_entry_template_fields;
DROP POLICY IF EXISTS "Allow public insert access to order_entry_template_fields" ON order_entry_template_fields;
DROP POLICY IF EXISTS "Allow public update access to order_entry_template_fields" ON order_entry_template_fields;
DROP POLICY IF EXISTS "Allow public delete access to order_entry_template_fields" ON order_entry_template_fields;

CREATE POLICY "Authenticated can select order_entry_template_fields"
  ON order_entry_template_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_template_fields"
  ON order_entry_template_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_template_fields"
  ON order_entry_template_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_template_fields"
  ON order_entry_template_fields FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_template_field_groups
DROP POLICY IF EXISTS "Allow public read access to order_entry_template_field_groups" ON order_entry_template_field_groups;
DROP POLICY IF EXISTS "Allow public insert access to order_entry_template_field_groups" ON order_entry_template_field_groups;
DROP POLICY IF EXISTS "Allow public update access to order_entry_template_field_groups" ON order_entry_template_field_groups;
DROP POLICY IF EXISTS "Allow public delete access to order_entry_template_field_groups" ON order_entry_template_field_groups;

CREATE POLICY "Authenticated can select order_entry_template_field_groups"
  ON order_entry_template_field_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_template_field_groups"
  ON order_entry_template_field_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_template_field_groups"
  ON order_entry_template_field_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_template_field_groups"
  ON order_entry_template_field_groups FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_template_field_layout
DROP POLICY IF EXISTS "Allow public read access to order_entry_template_field_layout" ON order_entry_template_field_layout;
DROP POLICY IF EXISTS "Allow public insert access to order_entry_template_field_layout" ON order_entry_template_field_layout;
DROP POLICY IF EXISTS "Allow public update access to order_entry_template_field_layout" ON order_entry_template_field_layout;
DROP POLICY IF EXISTS "Allow public delete access to order_entry_template_field_layout" ON order_entry_template_field_layout;

CREATE POLICY "Authenticated can select order_entry_template_field_layout"
  ON order_entry_template_field_layout FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_template_field_layout"
  ON order_entry_template_field_layout FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_template_field_layout"
  ON order_entry_template_field_layout FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_template_field_layout"
  ON order_entry_template_field_layout FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_json_schemas
DROP POLICY IF EXISTS "Allow public read access to json schemas" ON order_entry_json_schemas;
DROP POLICY IF EXISTS "Allow public insert access to json schemas" ON order_entry_json_schemas;
DROP POLICY IF EXISTS "Allow public update access to json schemas" ON order_entry_json_schemas;
DROP POLICY IF EXISTS "Allow public delete access to json schemas" ON order_entry_json_schemas;

CREATE POLICY "Authenticated can select order_entry_json_schemas"
  ON order_entry_json_schemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert order_entry_json_schemas"
  ON order_entry_json_schemas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order_entry_json_schemas"
  ON order_entry_json_schemas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_json_schemas"
  ON order_entry_json_schemas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TRACK & TRACE (19 tables)
-- ============================================================

-- track_trace_configs
DROP POLICY IF EXISTS "Allow public read access to track_trace_configs" ON track_trace_configs;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_configs" ON track_trace_configs;
DROP POLICY IF EXISTS "Allow public update access to track_trace_configs" ON track_trace_configs;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_configs" ON track_trace_configs;

CREATE POLICY "Authenticated can select track_trace_configs"
  ON track_trace_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_configs"
  ON track_trace_configs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_configs"
  ON track_trace_configs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_configs"
  ON track_trace_configs FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_fields
DROP POLICY IF EXISTS "Allow public read access to track_trace_fields" ON track_trace_fields;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_fields" ON track_trace_fields;
DROP POLICY IF EXISTS "Allow public update access to track_trace_fields" ON track_trace_fields;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_fields" ON track_trace_fields;

CREATE POLICY "Authenticated can select track_trace_fields"
  ON track_trace_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_fields"
  ON track_trace_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_fields"
  ON track_trace_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_fields"
  ON track_trace_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_templates
DROP POLICY IF EXISTS "Allow public read access to track_trace_templates" ON track_trace_templates;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_templates" ON track_trace_templates;
DROP POLICY IF EXISTS "Allow public update access to track_trace_templates" ON track_trace_templates;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_templates" ON track_trace_templates;

CREATE POLICY "Authenticated can select track_trace_templates"
  ON track_trace_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_templates"
  ON track_trace_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_templates"
  ON track_trace_templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_templates"
  ON track_trace_templates FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_template_fields
DROP POLICY IF EXISTS "Allow public read access to track_trace_template_fields" ON track_trace_template_fields;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_template_fields" ON track_trace_template_fields;
DROP POLICY IF EXISTS "Allow public update access to track_trace_template_fields" ON track_trace_template_fields;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_template_fields" ON track_trace_template_fields;

CREATE POLICY "Authenticated can select track_trace_template_fields"
  ON track_trace_template_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_template_fields"
  ON track_trace_template_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_template_fields"
  ON track_trace_template_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_template_fields"
  ON track_trace_template_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_template_default_fields
DROP POLICY IF EXISTS "Allow public read access to track_trace_template_default_fields" ON track_trace_template_default_fields;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_template_default_fiel" ON track_trace_template_default_fields;
DROP POLICY IF EXISTS "Allow public update access to track_trace_template_default_fiel" ON track_trace_template_default_fields;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_template_default_fiel" ON track_trace_template_default_fields;

CREATE POLICY "Authenticated can select track_trace_template_default_fields"
  ON track_trace_template_default_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_template_default_fields"
  ON track_trace_template_default_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_template_default_fields"
  ON track_trace_template_default_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_template_default_fields"
  ON track_trace_template_default_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_template_sections
DROP POLICY IF EXISTS "Allow public read access to track_trace_template_sections" ON track_trace_template_sections;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_template_sections" ON track_trace_template_sections;
DROP POLICY IF EXISTS "Allow public update access to track_trace_template_sections" ON track_trace_template_sections;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_template_sections" ON track_trace_template_sections;

CREATE POLICY "Authenticated can select track_trace_template_sections"
  ON track_trace_template_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_template_sections"
  ON track_trace_template_sections FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_template_sections"
  ON track_trace_template_sections FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_template_sections"
  ON track_trace_template_sections FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_filter_presets
DROP POLICY IF EXISTS "Allow public read access to track_trace_filter_presets" ON track_trace_filter_presets;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_filter_presets" ON track_trace_filter_presets;
DROP POLICY IF EXISTS "Allow public update access to track_trace_filter_presets" ON track_trace_filter_presets;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_filter_presets" ON track_trace_filter_presets;

CREATE POLICY "Authenticated can select track_trace_filter_presets"
  ON track_trace_filter_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_filter_presets"
  ON track_trace_filter_presets FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_filter_presets"
  ON track_trace_filter_presets FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_filter_presets"
  ON track_trace_filter_presets FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_document_configs
DROP POLICY IF EXISTS "Allow public read access to document configs" ON track_trace_document_configs;
DROP POLICY IF EXISTS "Allow public insert access to document configs" ON track_trace_document_configs;
DROP POLICY IF EXISTS "Allow public update access to document configs" ON track_trace_document_configs;
DROP POLICY IF EXISTS "Allow public delete access to document configs" ON track_trace_document_configs;

CREATE POLICY "Authenticated can select track_trace_document_configs"
  ON track_trace_document_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_document_configs"
  ON track_trace_document_configs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_document_configs"
  ON track_trace_document_configs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_document_configs"
  ON track_trace_document_configs FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_document_filters
DROP POLICY IF EXISTS "Allow public read access to document filters" ON track_trace_document_filters;
DROP POLICY IF EXISTS "Allow public insert access to document filters" ON track_trace_document_filters;
DROP POLICY IF EXISTS "Allow public update access to document filters" ON track_trace_document_filters;
DROP POLICY IF EXISTS "Allow public delete access to document filters" ON track_trace_document_filters;

CREATE POLICY "Authenticated can select track_trace_document_filters"
  ON track_trace_document_filters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_document_filters"
  ON track_trace_document_filters FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_document_filters"
  ON track_trace_document_filters FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_document_filters"
  ON track_trace_document_filters FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_barcode_configs
DROP POLICY IF EXISTS "Allow public read access to track_trace_barcode_configs" ON track_trace_barcode_configs;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_barcode_configs" ON track_trace_barcode_configs;
DROP POLICY IF EXISTS "Allow public update access to track_trace_barcode_configs" ON track_trace_barcode_configs;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_barcode_configs" ON track_trace_barcode_configs;

CREATE POLICY "Authenticated can select track_trace_barcode_configs"
  ON track_trace_barcode_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_barcode_configs"
  ON track_trace_barcode_configs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_barcode_configs"
  ON track_trace_barcode_configs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_barcode_configs"
  ON track_trace_barcode_configs FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_barcode_fields
DROP POLICY IF EXISTS "Allow public read access to track_trace_barcode_fields" ON track_trace_barcode_fields;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_barcode_fields" ON track_trace_barcode_fields;
DROP POLICY IF EXISTS "Allow public update access to track_trace_barcode_fields" ON track_trace_barcode_fields;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_barcode_fields" ON track_trace_barcode_fields;

CREATE POLICY "Authenticated can select track_trace_barcode_fields"
  ON track_trace_barcode_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_barcode_fields"
  ON track_trace_barcode_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_barcode_fields"
  ON track_trace_barcode_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_barcode_fields"
  ON track_trace_barcode_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_barcode_image_configs
DROP POLICY IF EXISTS "Allow public read access to track_trace_barcode_image_configs" ON track_trace_barcode_image_configs;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_barcode_image_configs" ON track_trace_barcode_image_configs;
DROP POLICY IF EXISTS "Allow public update access to track_trace_barcode_image_configs" ON track_trace_barcode_image_configs;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_barcode_image_configs" ON track_trace_barcode_image_configs;

CREATE POLICY "Authenticated can select track_trace_barcode_image_configs"
  ON track_trace_barcode_image_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_barcode_image_configs"
  ON track_trace_barcode_image_configs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_barcode_image_configs"
  ON track_trace_barcode_image_configs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_barcode_image_configs"
  ON track_trace_barcode_image_configs FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_timeline_statuses
DROP POLICY IF EXISTS "Allow public read access to track_trace_timeline_statuses" ON track_trace_timeline_statuses;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_timeline_statuses" ON track_trace_timeline_statuses;
DROP POLICY IF EXISTS "Allow public update access to track_trace_timeline_statuses" ON track_trace_timeline_statuses;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_timeline_statuses" ON track_trace_timeline_statuses;

CREATE POLICY "Authenticated can select track_trace_timeline_statuses"
  ON track_trace_timeline_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_timeline_statuses"
  ON track_trace_timeline_statuses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_timeline_statuses"
  ON track_trace_timeline_statuses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_timeline_statuses"
  ON track_trace_timeline_statuses FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_timeline_child_statuses
DROP POLICY IF EXISTS "Allow public read access to track_trace_timeline_child_statuses" ON track_trace_timeline_child_statuses;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_timeline_child_status" ON track_trace_timeline_child_statuses;
DROP POLICY IF EXISTS "Allow public update access to track_trace_timeline_child_status" ON track_trace_timeline_child_statuses;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_timeline_child_status" ON track_trace_timeline_child_statuses;

CREATE POLICY "Authenticated can select track_trace_timeline_child_statuses"
  ON track_trace_timeline_child_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_timeline_child_statuses"
  ON track_trace_timeline_child_statuses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_timeline_child_statuses"
  ON track_trace_timeline_child_statuses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_timeline_child_statuses"
  ON track_trace_timeline_child_statuses FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_route_summary_groups
DROP POLICY IF EXISTS "Allow public read access to track_trace_route_summary_groups" ON track_trace_route_summary_groups;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_route_summary_groups" ON track_trace_route_summary_groups;
DROP POLICY IF EXISTS "Allow public update access to track_trace_route_summary_groups" ON track_trace_route_summary_groups;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_route_summary_groups" ON track_trace_route_summary_groups;

CREATE POLICY "Authenticated can select track_trace_route_summary_groups"
  ON track_trace_route_summary_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_route_summary_groups"
  ON track_trace_route_summary_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_route_summary_groups"
  ON track_trace_route_summary_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_route_summary_groups"
  ON track_trace_route_summary_groups FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_route_summary_fields
DROP POLICY IF EXISTS "Allow public read access to track_trace_route_summary_fields" ON track_trace_route_summary_fields;
DROP POLICY IF EXISTS "Allow public insert access to track_trace_route_summary_fields" ON track_trace_route_summary_fields;
DROP POLICY IF EXISTS "Allow public update access to track_trace_route_summary_fields" ON track_trace_route_summary_fields;
DROP POLICY IF EXISTS "Allow public delete access to track_trace_route_summary_fields" ON track_trace_route_summary_fields;

CREATE POLICY "Authenticated can select track_trace_route_summary_fields"
  ON track_trace_route_summary_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_route_summary_fields"
  ON track_trace_route_summary_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_route_summary_fields"
  ON track_trace_route_summary_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_route_summary_fields"
  ON track_trace_route_summary_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_shipment_summary_config (has SELECT + FOR ALL)
DROP POLICY IF EXISTS "Allow public read access to shipment_summary_config" ON track_trace_shipment_summary_config;
DROP POLICY IF EXISTS "Allow public write access to shipment_summary_config" ON track_trace_shipment_summary_config;

CREATE POLICY "Authenticated can select track_trace_shipment_summary_config"
  ON track_trace_shipment_summary_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_shipment_summary_config"
  ON track_trace_shipment_summary_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_shipment_summary_config"
  ON track_trace_shipment_summary_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_shipment_summary_config"
  ON track_trace_shipment_summary_config FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_shipment_summary_fields (has SELECT + FOR ALL)
DROP POLICY IF EXISTS "Allow public read access to shipment_summary_fields" ON track_trace_shipment_summary_fields;
DROP POLICY IF EXISTS "Allow public write access to shipment_summary_fields" ON track_trace_shipment_summary_fields;

CREATE POLICY "Authenticated can select track_trace_shipment_summary_fields"
  ON track_trace_shipment_summary_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_shipment_summary_fields"
  ON track_trace_shipment_summary_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_shipment_summary_fields"
  ON track_trace_shipment_summary_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_shipment_summary_fields"
  ON track_trace_shipment_summary_fields FOR DELETE TO authenticated USING (public.is_admin());

-- track_trace_shipment_summary_groups (has SELECT + FOR ALL)
DROP POLICY IF EXISTS "Allow public read access to shipment_summary_groups" ON track_trace_shipment_summary_groups;
DROP POLICY IF EXISTS "Allow public write access to shipment_summary_groups" ON track_trace_shipment_summary_groups;

CREATE POLICY "Authenticated can select track_trace_shipment_summary_groups"
  ON track_trace_shipment_summary_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert track_trace_shipment_summary_groups"
  ON track_trace_shipment_summary_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update track_trace_shipment_summary_groups"
  ON track_trace_shipment_summary_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete track_trace_shipment_summary_groups"
  ON track_trace_shipment_summary_groups FOR DELETE TO authenticated USING (public.is_admin());

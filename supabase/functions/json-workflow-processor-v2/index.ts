import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, getValueByPath, createV2StepLog, updateV2ExecutionLog, buildEdgeMap, getNextNodeId } from "./utils.ts";
import { executeApiCall } from "./steps/api.ts";
import { executeApiEndpoint } from "./steps/apiEndpoint.ts";
import { executeRename } from "./steps/rename.ts";
import { executeSftpUpload } from "./steps/upload.ts";
import { executeEmailAction } from "./steps/email.ts";
import { executeConditionalCheck } from "./steps/logic.ts";
import { executeMultipartFormUpload } from "./steps/multipart.ts";
import { executeAiDecision } from "./steps/aiDecision.ts";
import { executeImaging } from "./steps/imaging.ts";
import { executeReadEmail } from "./steps/readEmail.ts";
import { evaluateFunction, evaluateAddressLookupAsync, type FunctionLogic } from "./functionEvaluator.ts";

const MAX_NODE_VISITS = 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log('=== JSON WORKFLOW V2 PROCESSOR START ===');
  let executionLogId: string | null = null;
  let extractionLogId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let requestData: any;
    try {
      const requestText = await req.text();
      if (!requestText || requestText.trim() === '') {
        throw new Error('Request body is empty');
      }
      requestData = JSON.parse(requestText);
      console.log('Request keys:', Object.keys(requestData));
    } catch (parseError: any) {
      return new Response(JSON.stringify({
        error: "Invalid request format",
        details: parseError instanceof Error ? parseError.message : "Unknown parse error"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('Workflow ID:', requestData.workflowId);
    console.log('User ID:', requestData.userId || 'none');
    console.log('PDF filename:', requestData.pdfFilename);

    let typeDetails: any = null;
    let formatType = 'JSON';
    try {
      if (requestData.extractionTypeId) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/extraction_types?id=eq.${requestData.extractionTypeId}`, {
          headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey }
        });
        if (resp.ok) {
          const types = await resp.json();
          if (types && types.length > 0) {
            typeDetails = types[0];
            formatType = typeDetails.format_type || 'JSON';
          }
        }
      } else if (requestData.transformationTypeId) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/transformation_types?id=eq.${requestData.transformationTypeId}`, {
          headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey }
        });
        if (resp.ok) {
          const types = await resp.json();
          if (types && types.length > 0) {
            typeDetails = types[0];
            formatType = typeDetails.format_type || 'JSON';
          }
        }
      }
    } catch (typeError) {
      console.error('Failed to fetch type details:', typeError);
    }

    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/extraction_logs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          user_id: requestData.userId || null,
          extraction_type_id: requestData.extractionTypeId || null,
          transformation_type_id: requestData.transformationTypeId || null,
          pdf_filename: requestData.originalPdfFilename,
          pdf_pages: requestData.pdfPages,
          extraction_status: 'success',
          extracted_data: requestData.extractedData || null,
          processing_mode: requestData.transformationTypeId ? 'transformation' : 'extraction',
          session_id: requestData.sessionId || null,
          group_order: requestData.groupOrder || null,
          created_at: new Date().toISOString()
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        extractionLogId = data[0]?.id;
        console.log('Extraction log created:', extractionLogId);
      }
    } catch (logError) {
      console.error('Error creating extraction log:', logError);
    }

    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/workflow_v2_execution_logs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          workflow_id: requestData.workflowId,
          extraction_log_id: extractionLogId,
          status: 'running',
          context_data: {},
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: requestData.userId || null,
          processing_mode: requestData.transformationTypeId ? 'transformation' : 'extraction',
          extraction_type_id: requestData.extractionTypeId || null,
          transformation_type_id: requestData.transformationTypeId || null
        })
      });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.trim()) {
          const data = JSON.parse(text);
          executionLogId = data[0]?.id;
          console.log('V2 execution log created:', executionLogId);
        }
      } else {
        console.error('Failed to create V2 execution log:', resp.status);
      }
    } catch (logError) {
      console.error('Error creating V2 execution log:', logError);
    }

    let extractedData: any = {};
    if (requestData.extractedDataStoragePath) {
      try {
        const storageUrl = `${supabaseUrl}/storage/v1/object/pdfs/${requestData.extractedDataStoragePath}`;
        const resp = await fetch(storageUrl, { headers: { 'Authorization': `Bearer ${supabaseServiceKey}` } });
        if (resp.ok) {
          const text = await resp.text();
          if (text && text.trim()) {
            extractedData = JSON.parse(text);
          }
        }
      } catch (storageError) {
        console.error('Storage loading error:', storageError);
      }
    } else if (requestData.extractedData) {
      try {
        if (typeof requestData.extractedData === 'string') {
          if (requestData.extractedData.trim() === '') {
            extractedData = {};
          } else if (formatType === 'CSV') {
            extractedData = requestData.extractedData;
          } else {
            extractedData = JSON.parse(requestData.extractedData);
          }
        } else {
          extractedData = requestData.extractedData || {};
        }
      } catch (parseError) {
        if (formatType === 'CSV' && typeof requestData.extractedData === 'string') {
          extractedData = requestData.extractedData;
        } else {
          extractedData = {};
        }
      }
    }

    // Evaluate function-type field mappings
    if (formatType !== 'CSV' && typeof extractedData === 'object' && extractedData !== null && typeDetails?.field_mappings) {
      try {
        const fieldMappings = typeof typeDetails.field_mappings === 'string'
          ? JSON.parse(typeDetails.field_mappings)
          : typeDetails.field_mappings;

        const functionMappings = (fieldMappings || []).filter((m: any) => m.type === 'function' && m.functionId);

        if (functionMappings.length > 0) {
          console.log(`Found ${functionMappings.length} function-type field mappings to evaluate`);

          const functionIds = [...new Set(functionMappings.map((m: any) => m.functionId))];
          const idsParam = functionIds.map((id: string) => `"${id}"`).join(',');
          const fnResp = await fetch(
            `${supabaseUrl}/rest/v1/field_mapping_functions?id=in.(${idsParam})`,
            { headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey } }
          );

          if (fnResp.ok) {
            const functions: any[] = await fnResp.json();
            console.log(`Loaded ${functions.length} function definitions`);

            let geminiApiKey = '';
            const hasAddressLookup = functions.some((f: any) => f.function_logic?.type === 'address_lookup');
            if (hasAddressLookup) {
              try {
                const keyResp = await fetch(
                  `${supabaseUrl}/rest/v1/gemini_api_keys?is_active=eq.true&select=api_key&limit=1`,
                  { headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey } }
                );
                if (keyResp.ok) {
                  const keys = await keyResp.json();
                  if (keys.length > 0) geminiApiKey = keys[0].api_key;
                }
              } catch (_e) { /* continue without address lookup */ }
            }

            const setFieldValue = (obj: any, fieldPath: string, value: any) => {
              const parts = fieldPath.split('.');
              let current = obj;
              for (let i = 0; i < parts.length - 1; i++) {
                if (current[parts[i]] === undefined) current[parts[i]] = {};
                if (Array.isArray(current[parts[i]])) {
                  const remainingPath = parts.slice(i + 1).join('.');
                  current[parts[i]].forEach((item: any) => setFieldValue(item, remainingPath, value));
                  return;
                }
                current = current[parts[i]];
              }
              current[parts[parts.length - 1]] = value;
            };

            const orders = Array.isArray(extractedData.orders) ? extractedData.orders : [extractedData];
            for (const order of orders) {
              for (const mapping of functionMappings) {
                const func = functions.find((f: any) => f.id === mapping.functionId);
                if (func?.function_logic) {
                  let result: any;
                  if (func.function_logic.type === 'address_lookup' && geminiApiKey) {
                    result = await evaluateAddressLookupAsync(func.function_logic, order, geminiApiKey);
                  } else {
                    result = evaluateFunction(func.function_logic as FunctionLogic, order);
                  }
                  if (result !== undefined && result !== '') {
                    setFieldValue(order, mapping.fieldName, result);
                    console.log(`Function "${func.function_name}" -> ${mapping.fieldName} = ${JSON.stringify(result)}`);
                  }
                }
              }
            }
            console.log('Function evaluation complete');
          }
        }
      } catch (fnError) {
        console.error('Function evaluation error (non-fatal):', fnError);
      }
    }

    const nodesResp = await fetch(`${supabaseUrl}/rest/v1/workflow_v2_nodes?workflow_id=eq.${requestData.workflowId}&order=created_at.asc`, {
      headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey }
    });
    if (!nodesResp.ok) {
      throw new Error('Failed to fetch workflow V2 nodes');
    }
    const nodes: any[] = await nodesResp.json();
    console.log('Loaded', nodes.length, 'V2 nodes');

    const edgesResp = await fetch(`${supabaseUrl}/rest/v1/workflow_v2_edges?workflow_id=eq.${requestData.workflowId}`, {
      headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey }
    });
    if (!edgesResp.ok) {
      throw new Error('Failed to fetch workflow V2 edges');
    }
    const edges: any[] = await edgesResp.json();
    console.log('Loaded', edges.length, 'V2 edges');

    const startNode = nodes.find((n: any) => n.node_type === 'start');
    if (!startNode) {
      throw new Error('No start node found in workflow V2');
    }

    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }
    const edgeMap = buildEdgeMap(edges);

    let workflowOnlyFields: any = {};
    if (requestData.workflowOnlyData) {
      try {
        workflowOnlyFields = typeof requestData.workflowOnlyData === 'string'
          ? JSON.parse(requestData.workflowOnlyData)
          : requestData.workflowOnlyData;
      } catch (_e) {
        workflowOnlyFields = {};
      }
    }

    const formattedTimestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let contextData: any = {
      extractedData: extractedData,
      originalExtractedData: requestData.extractedData,
      formatType: formatType,
      pdfFilename: requestData.extractionTypeFilename || requestData.pdfFilename,
      originalPdfFilename: requestData.originalPdfFilename,
      extractionTypeFilename: requestData.pageGroupFilenameTemplate || typeDetails?.filename_template || requestData.extractionTypeFilename,
      pageGroupFilenameTemplate: requestData.pageGroupFilenameTemplate,
      pdfStoragePath: requestData.pdfStoragePath,
      pdfBase64: requestData.pdfBase64,
      userId: requestData.userId || null,
      senderEmail: requestData.senderEmail || requestData.submitterEmail || null,
      submitterEmail: requestData.submitterEmail || null,
      extractionTypeName: typeDetails?.name || 'Unknown',
      timestamp: formattedTimestamp,
      ...workflowOnlyFields
    };

    if (requestData.contextData && typeof requestData.contextData === 'object') {
      contextData = { ...contextData, ...requestData.contextData };
      console.log('Merged incoming contextData keys:', Object.keys(requestData.contextData));
    }

    if (formatType !== 'CSV' && typeof extractedData === 'object' && extractedData !== null) {
      contextData = { ...contextData, ...extractedData };

      if (Array.isArray(extractedData.orders) && extractedData.orders.length > 0) {
        const firstOrder = extractedData.orders[0];
        if (typeof firstOrder === 'object' && firstOrder !== null) {
          contextData = { ...contextData, ...firstOrder };
          console.log('Spread first order fields into contextData. Keys added:', Object.keys(firstOrder));
        }
      }
    }

    if (requestData.sessionId && requestData.groupOrder && requestData.groupOrder > 1) {
      try {
        const prevResp = await fetch(
          `${supabaseUrl}/rest/v1/extraction_group_data?session_id=eq.${requestData.sessionId}&group_order=lt.${requestData.groupOrder}&order=group_order.asc`,
          { headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'apikey': supabaseServiceKey } }
        );
        if (prevResp.ok) {
          const prevGroups = await prevResp.json();
          for (const prevGroup of prevGroups) {
            const groupPrefix = `group${prevGroup.group_order}_`;
            const prevFields = prevGroup.extracted_fields || {};
            for (const [fieldName, fieldValue] of Object.entries(prevFields)) {
              contextData[`${groupPrefix}${fieldName}`] = fieldValue;
            }
          }
        }
      } catch (prevGroupError) {
        console.error('Failed to retrieve previous group data:', prevGroupError);
      }
    }

    console.log('=== STARTING GRAPH TRAVERSAL ===');
    let currentNodeId = getNextNodeId(edgeMap, startNode.id, 'default');
    let lastApiResponse: any = null;
    let visitCount = 0;

    while (currentNodeId) {
      visitCount++;
      if (visitCount > MAX_NODE_VISITS) {
        throw new Error(`Graph traversal exceeded maximum of ${MAX_NODE_VISITS} node visits. Possible cycle detected.`);
      }

      const node = nodeMap.get(currentNodeId);
      if (!node) {
        console.error(`Node ${currentNodeId} not found in node map`);
        break;
      }

      if (node.node_type === 'start') {
        currentNodeId = getNextNodeId(edgeMap, node.id, 'default');
        continue;
      }

      const stepStartTime = new Date().toISOString();
      const stepStartMs = Date.now();
      console.log(`\n=== EXECUTING NODE: ${node.label} (${node.step_type}) ===`);

      if (executionLogId) {
        try {
          await updateV2ExecutionLog(supabaseUrl, supabaseServiceKey, executionLogId, {
            current_node_id: node.id,
            current_node_label: node.label,
            context_data: contextData,
            updated_at: new Date().toISOString()
          });
        } catch (_e) { /* continue */ }
      }

      let stepOutputData: any = null;
      let nextHandle = 'default';

      try {
        const config = node.config_json || {};

        let shouldSkipNode = false;
        let skipReason = '';
        if (config.skipIf) {
          const conditionResult = getValueByPath(contextData, config.skipIf);
          if (conditionResult === true) {
            shouldSkipNode = true;
            skipReason = `skipIf condition met: ${config.skipIf} = true`;
          }
        }
        if (!shouldSkipNode && config.runIf) {
          const conditionResult = getValueByPath(contextData, config.runIf);
          if (conditionResult !== true) {
            shouldSkipNode = true;
            skipReason = `runIf condition not met: ${config.runIf} = ${conditionResult}`;
          }
        }

        if (shouldSkipNode) {
          stepOutputData = { skipped: true, reason: skipReason, conditionalSkip: true };
          const stepEndTime = new Date().toISOString();
          const stepDurationMs = Date.now() - stepStartMs;
          console.log(`Node ${node.label} skipped: ${skipReason}`);
          if (executionLogId) {
            await createV2StepLog(supabaseUrl, supabaseServiceKey, executionLogId, requestData.workflowId, node, 'skipped', stepStartTime, stepEndTime, stepDurationMs, skipReason, { config: node.config_json }, stepOutputData, contextData);
          }
          currentNodeId = getNextNodeId(edgeMap, node.id, 'default');
          continue;
        }

        let apiCallResolvedBody: string | undefined;
        if (node.step_type === 'api_call') {
          const apiResult = await executeApiCall(node, contextData);
          stepOutputData = apiResult.responseData;
          lastApiResponse = stepOutputData;
          apiCallResolvedBody = apiResult.resolvedRequestBody;

        } else if (node.step_type === 'api_endpoint') {
          const result = await executeApiEndpoint(node, contextData, supabaseUrl, supabaseServiceKey);
          lastApiResponse = result.responseData;
          stepOutputData = result.stepOutput;

        } else if (node.step_type === 'rename_file' || node.step_type === 'rename_pdf') {
          stepOutputData = executeRename(node, contextData, lastApiResponse, formatType);

        } else if (node.step_type === 'sftp_upload') {
          stepOutputData = await executeSftpUpload(node, contextData, supabaseUrl, supabaseServiceKey, formatType);

        } else if (node.step_type === 'email_action') {
          stepOutputData = await executeEmailAction(node, contextData, supabaseUrl, supabaseServiceKey);

        } else if (node.step_type === 'conditional_check') {
          stepOutputData = executeConditionalCheck(node, contextData);
          nextHandle = stepOutputData.conditionMet ? 'success' : 'failure';

        } else if (node.step_type === 'multipart_form_upload') {
          stepOutputData = await executeMultipartFormUpload(node, contextData, supabaseUrl, supabaseServiceKey);

        } else if (node.step_type === 'ai_decision') {
          const result = await executeAiDecision(node, contextData, supabaseUrl, supabaseServiceKey, executionLogId, requestData.workflowId);
          lastApiResponse = result.responseData;
          stepOutputData = result.stepOutput;

        } else if (node.step_type === 'imaging') {
          stepOutputData = await executeImaging(node, contextData, supabaseUrl, supabaseServiceKey);

        } else if (node.step_type === 'read_email') {
          const result = await executeReadEmail(node, contextData, supabaseUrl, supabaseServiceKey, executionLogId, requestData.workflowId);
          stepOutputData = result.stepOutput;

        } else {
          console.log(`Unknown step type: ${node.step_type}`);
          stepOutputData = { skipped: true, reason: 'Step type not implemented' };
        }

        const stepEndTime = new Date().toISOString();
        const stepDurationMs = Date.now() - stepStartMs;
        console.log(`Node ${node.label} completed in ${stepDurationMs}ms`);

        if (executionLogId && node.step_type !== 'ai_decision' && node.step_type !== 'read_email') {
          const stepInputData = node.step_type === 'api_call'
            ? { config: node.config_json, extractedData: contextData.extractedData, resolvedRequestBody: apiCallResolvedBody }
            : { config: node.config_json };
          await createV2StepLog(supabaseUrl, supabaseServiceKey, executionLogId, requestData.workflowId, node, 'completed', stepStartTime, stepEndTime, stepDurationMs, undefined, stepInputData, stepOutputData, contextData);
        }

      } catch (stepError: any) {
        const stepEndTime = new Date().toISOString();
        const stepDurationMs = Date.now() - stepStartMs;
        console.error(`Node ${node.label} failed:`, stepError.message);

        if (executionLogId) {
          const errorOutputData = (node.step_type === 'api_endpoint' && stepError.outputData) ? stepError.outputData : stepOutputData;
          const errorInputData = node.step_type === 'api_call'
            ? { config: node.config_json, extractedData: contextData.extractedData }
            : { config: node.config_json };
          await createV2StepLog(supabaseUrl, supabaseServiceKey, executionLogId, requestData.workflowId, node, 'failed', stepStartTime, stepEndTime, stepDurationMs, stepError.message, errorInputData, errorOutputData, contextData);

          await updateV2ExecutionLog(supabaseUrl, supabaseServiceKey, executionLogId, {
            status: 'failed',
            error_message: stepError.message,
            context_data: contextData,
            updated_at: new Date().toISOString()
          });
        }

        const error: any = new Error(stepError.message);
        error.workflowExecutionLogId = executionLogId;
        error.extractionLogId = extractionLogId;
        throw error;
      }

      currentNodeId = getNextNodeId(edgeMap, node.id, nextHandle);
    }

    console.log('=== GRAPH TRAVERSAL COMPLETE ===');
    console.log(`Visited ${visitCount} nodes`);

    if (executionLogId) {
      await updateV2ExecutionLog(supabaseUrl, supabaseServiceKey, executionLogId, {
        status: 'completed',
        context_data: contextData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'V2 workflow executed successfully',
      workflowExecutionLogId: executionLogId,
      extractionLogId: extractionLogId,
      finalData: contextData,
      lastApiResponse: lastApiResponse,
      actualFilename: contextData.actualFilename || contextData.renamedFilename
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("=== V2 WORKFLOW EXECUTION ERROR ===");
    console.error("Error:", error.message);

    if (executionLogId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        await updateV2ExecutionLog(supabaseUrl, supabaseServiceKey, executionLogId, {
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        });
      } catch (_updateError) { /* best effort */ }
    }

    return new Response(JSON.stringify({
      error: "V2 workflow execution failed",
      details: error instanceof Error ? error.message : "Unknown error",
      workflowExecutionLogId: executionLogId,
      extractionLogId: extractionLogId
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

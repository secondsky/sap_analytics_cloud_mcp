/**
 * Monitoring tools — Audit export and monitoring
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError, buildODataQuery } from "./_helpers.js";

export function registerMonitoringTools(server: McpServer): void {
  server.tool(
    "sac_audit_export",
    "Export audit activity logs with OData query params.",
    {
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
      $orderby: z.string().optional().describe("Order by"),
      $select: z.string().optional().describe("Fields to return"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(args as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `/api/v1/audit/activities/exportActivities${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_monitoring_get",
    "Get monitoring data for a model.",
    {
      modelId: z.string().describe("Model ID"),
    },
    async ({ modelId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/monitoring/${encodeURIComponent(modelId)}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

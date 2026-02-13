/**
 * Multi Actions tools — Execute and get status
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError } from "./_helpers.js";

export function registerMultiActionTools(server: McpServer): void {
  // ── POST /api/v1/multiActions/<id>/executions ───────────────────
  server.tool(
    "sac_multi_action_execute",
    "Execute a multi action. ID format: <packageId>:<objectId>. Body requires parameterValues array (empty if none).",
    {
      multiActionId: z.string().describe("ID as packageId:objectId, e.g. t.TEST:CEEFOKMRUKJBY5BN47F1NS2L8G"),
      parameterValues: z.array(
        z.object({
          parameterId: z.string().describe("Parameter ID"),
          value: z.union([
            z.number(),
            z.object({
              memberIds: z.union([z.array(z.string()), z.array(z.array(z.string()))]),
              hierarchyId: z.string().nullable().optional(),
            }),
          ]),
        }),
      ).optional().default([]).describe("Parameters array, empty [] if none required"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ multiActionId, parameterValues, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPost(
          cfg,
          `/api/v1/multiActions/${multiActionId}/executions`,
          { parameterValues },
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/multiActions/<id>/executions/<execId> ───────────
  server.tool(
    "sac_multi_action_get_status",
    "Get execution status of a multi action.",
    {
      multiActionId: z.string().describe("Multi action ID"),
      executionId: z.string().describe("Execution ID"),
    },
    async ({ multiActionId, executionId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(
          cfg,
          `/api/v1/multiActions/${multiActionId}/executions/${executionId}`,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

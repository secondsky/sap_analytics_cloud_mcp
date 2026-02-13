/**
 * Schedule & Publication tools — Schedules CRUD
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost, sacPatch, sacDelete } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError } from "./_helpers.js";

export function registerSchedulePublicationTools(server: McpServer): void {
  server.tool(
    "sac_schedule_get_template",
    "Get schedule creation template with defaults.",
    {},
    async () => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, "/api/v1/ps/schedules/template");
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_schedule_create",
    "Create a publication schedule.",
    {
      body: z.record(z.string(), z.unknown()).describe("Schedule definition"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPost(cfg, "/api/v1/ps/schedules", body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_schedule_update",
    "Update a publication schedule (partial).",
    {
      scheduleId: z.string().describe("Schedule ID"),
      body: z.record(z.string(), z.unknown()).describe("Fields to update"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ scheduleId, body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPatch(cfg, `/api/v1/ps/schedules/${encodeURIComponent(scheduleId)}`, body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_schedule_delete",
    "Delete a publication schedule.",
    {
      scheduleId: z.string().describe("Schedule ID"),
      body: z.record(z.string(), z.unknown()).optional().describe("Deletion parameters"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ scheduleId, body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        await sacDelete(cfg, `/api/v1/ps/schedules/${encodeURIComponent(scheduleId)}`, body);
        return toolSuccess({ deleted: true });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

/**
 * Calendar tools — Get, update, and copy calendar events
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost, sacPatch } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError } from "./_helpers.js";

export function registerCalendarTools(server: McpServer): void {
  server.tool(
    "sac_calendar_get_event",
    "Get a calendar event by ID.",
    {
      eventId: z.string().describe("Event ID"),
    },
    async ({ eventId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/calendar/events/${encodeURIComponent(eventId)}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_calendar_update_event",
    "Update a calendar event (partial).",
    {
      eventId: z.string().describe("Event ID"),
      body: z.record(z.string(), z.unknown()).describe("Fields to update"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ eventId, body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPatch(cfg, `/api/v1/calendar/events/${encodeURIComponent(eventId)}`, body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_calendar_copy_event",
    "Copy/create a calendar event.",
    {
      body: z.record(z.string(), z.unknown()).describe("Event definition"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPost(cfg, "/api/v1/calendar/events", body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

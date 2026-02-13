/**
 * Content Transport tools — Export/import jobs, packages, permissions
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost, sacPut, sacDelete } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError } from "./_helpers.js";

export function registerContentTransportTools(server: McpServer): void {
  server.tool(
    "sac_transport_create_export_job",
    "Create a content transport export job.",
    {
      body: z.record(z.string(), z.unknown()).describe("Export job definition"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPost(cfg, "/api/v1/content/jobs", body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_get_job_status",
    "Get content transport job status.",
    {
      jobId: z.string().describe("Job ID"),
    },
    async ({ jobId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/content/jobs/${encodeURIComponent(jobId)}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_create_import_job",
    "Create a content transport import job.",
    {
      body: z.record(z.string(), z.unknown()).describe("Import job definition"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPost(cfg, "/api/v1/content/jobs", body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_delete_content",
    "Delete a content item.",
    {
      itemId: z.string().describe("Content item ID"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ itemId, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        await sacDelete(cfg, `/api/v1/content/${encodeURIComponent(itemId)}`);
        return toolSuccess({ deleted: true });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_get_content_item",
    "Get content item details within a wave.",
    {
      itemId: z.string().describe("Content item ID"),
      waveItemId: z.string().describe("Wave item ID"),
    },
    async ({ itemId, waveItemId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(
          cfg,
          `/api/v1/content/${encodeURIComponent(itemId)}/${encodeURIComponent(waveItemId)}`,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_get_permissions",
    "Get permissions for a content item.",
    {
      itemId: z.string().describe("Content item ID"),
    },
    async ({ itemId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/content/permissions/${encodeURIComponent(itemId)}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_transport_move_item",
    "Move a content item to a target location.",
    {
      itemId: z.string().describe("Item ID to move"),
      targetId: z.string().describe("Target location ID"),
      body: z.record(z.string(), z.unknown()).optional().describe("Move parameters"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ itemId, targetId, body, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPut(
          cfg,
          `/api/v1/content/${encodeURIComponent(itemId)}/${encodeURIComponent(targetId)}`,
          body ?? {},
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

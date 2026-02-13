/**
 * Content tools — Stories, Resources, FileRepository, Repositories, WidgetQuery
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost, sacPatch, sacDelete } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError, buildODataQuery } from "./_helpers.js";

export function registerContentTools(server: McpServer): void {
  // ── GET /api/v1/stories ─────────────────────────────────────────
  server.tool(
    "sac_stories_list",
    "List stories. Supports OData $filter, $orderby, $select, $expand, $top, $skip, $inlinecount, $format.",
    {
      includeModels: z.boolean().optional().describe("Include model metadata"),
      $top: z.number().optional().default(20).describe("Max results (default 20)"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
      $orderby: z.string().optional().describe("e.g. 'name desc'"),
      $select: z.string().optional().describe("Comma-separated fields"),
      $expand: z.string().optional().describe("Expand related entities"),
      $inlinecount: z.enum(["allpages", "none"]).optional().describe("Include total count"),
      $format: z.enum(["json", "xml"]).optional().describe("Response format"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const top = args.$top ?? 20;
        const params = new URLSearchParams();

        if (args.includeModels) params.append("include", "models");
        params.append("$top", top.toString());
        if (args.$skip) params.append("$skip", args.$skip.toString());
        if (args.$filter) params.append("$filter", args.$filter);
        if (args.$orderby) params.append("$orderby", args.$orderby);
        if (args.$select) params.append("$select", args.$select);
        if (args.$expand) params.append("$expand", args.$expand);
        if (args.$inlinecount) params.append("$inlinecount", args.$inlinecount);
        if (args.$format) params.append("$format", args.$format);

        const path = `/api/v1/stories?${params.toString()}`;
        const result = await sacGet(cfg, path);

        if (Array.isArray(result)) {
          return toolSuccess(result.slice(0, top));
        }

        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── POST /api/v1/stories?copyFrom=<id> ─────────────────────────
  server.tool(
    "sac_stories_copy",
    "Copy a story.",
    {
      sourceStoryId: z.string().describe("Source story ID"),
      copyToFolder: z.string().optional().describe("Target folder"),
      newName: z.string().optional().describe("Name for copy"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ sourceStoryId, copyToFolder, newName, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        let path = `/api/v1/stories?copyFrom=${encodeURIComponent(sourceStoryId)}`;
        if (copyToFolder) path += `&copyTo=${encodeURIComponent(copyToFolder)}`;
        const body = newName ? { name: newName } : undefined;
        const result = await sacPost(cfg, path, body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── PATCH /api/v1/stories/<id> ──────────────────────────────────
  server.tool(
    "sac_stories_rename",
    "Rename a story.",
    {
      storyId: z.string().describe("Story ID"),
      newName: z.string().describe("New name"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ storyId, newName, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const result = await sacPatch(cfg, `/api/v1/stories/${encodeURIComponent(storyId)}`, { name: newName });
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── DELETE /api/v1/stories/<id> ─────────────────────────────────
  server.tool(
    "sac_stories_delete",
    "Delete a story.",
    {
      storyId: z.string().describe("Story ID"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ storyId, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        await sacDelete(cfg, `/api/v1/stories/${encodeURIComponent(storyId)}`);
        return toolSuccess({ deleted: true });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/$metadata ───────────────────────────────────────
  server.tool(
    "sac_metadata_get",
    "Get OData metadata document for the SAC REST API.",
    {},
    async () => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, "/api/v1/$metadata");
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/Resources ───────────────────────────────────────
  server.tool(
    "sac_resources_list",
    "List resources (stories/apps). Supports OData $filter, $orderby, $select, $expand, $top, $skip, $inlinecount, $format.",
    {
      $top: z.number().optional().default(20).describe("Max results (default 20)"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
      $orderby: z.string().optional().describe("e.g. 'name desc'"),
      $select: z.string().optional().describe("Comma-separated fields"),
      $expand: z.string().optional().describe("Expand related entities"),
      $inlinecount: z.enum(["allpages", "none"]).optional().describe("Include total count"),
      $format: z.enum(["json", "xml"]).optional().describe("Response format"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const top = args.$top ?? 20;
        const queryArgs = { ...args, $top: top };
        const qs = buildODataQuery(queryArgs as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `/api/v1/Resources${qs}`);

        if (Array.isArray(result) && result.length > top) {
          return toolSuccess(result.slice(0, top));
        }
        if (result && typeof result === 'object' && 'value' in result && Array.isArray((result as any).value)) {
          const val = (result as any).value;
          if (val.length > top) {
            return toolSuccess({ ...result, value: val.slice(0, top) });
          }
        }

        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/Resources('<id>') ───────────────────────────────
  server.tool(
    "sac_resources_get",
    "Get a single resource by ID.",
    {
      resourceId: z.string().describe("Resource ID"),
    },
    async ({ resourceId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/Resources('${encodeURIComponent(resourceId)}')`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/filerepository/Resources ────────────────────────
  server.tool(
    "sac_filerepository_list",
    "List file repository resources. Supports OData query params.",
    {
      $top: z.number().optional().default(20).describe("Max results (default 20)"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
      $orderby: z.string().optional().describe("e.g. 'name desc'"),
      $select: z.string().optional().describe("Comma-separated fields"),
      $expand: z.string().optional().describe("Expand related entities"),
      $inlinecount: z.enum(["allpages", "none"]).optional().describe("Include total count"),
      $format: z.enum(["json", "xml"]).optional().describe("Response format"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const top = args.$top ?? 20;
        const queryArgs = { ...args, $top: top };
        const qs = buildODataQuery(queryArgs as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `/api/v1/filerepository/Resources${qs}`);

        if (Array.isArray(result) && result.length > top) {
          return toolSuccess(result.slice(0, top));
        }
        if (result && typeof result === 'object' && 'value' in result && Array.isArray((result as any).value)) {
          const val = (result as any).value;
          if (val.length > top) {
            return toolSuccess({ ...result, value: val.slice(0, top) });
          }
        }
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/Repositories ────────────────────────────────────
  server.tool(
    "sac_repositories_list",
    "List repositories. Supports OData query params.",
    {
      $top: z.number().optional().default(20).describe("Max results (default 20)"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
      $orderby: z.string().optional().describe("e.g. 'name desc'"),
      $select: z.string().optional().describe("Comma-separated fields"),
      $expand: z.string().optional().describe("Expand related entities"),
      $inlinecount: z.enum(["allpages", "none"]).optional().describe("Include total count"),
      $format: z.enum(["json", "xml"]).optional().describe("Response format"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const top = args.$top ?? 20;
        const queryArgs = { ...args, $top: top };
        const qs = buildODataQuery(queryArgs as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `/api/v1/Repositories${qs}`);

        if (Array.isArray(result) && result.length > top) {
          return toolSuccess(result.slice(0, top));
        }
        if (result && typeof result === 'object' && 'value' in result && Array.isArray((result as any).value)) {
          const val = (result as any).value;
          if (val.length > top) {
            return toolSuccess({ ...result, value: val.slice(0, top) });
          }
        }
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── GET /api/v1/widgetquery/getWidgetData ───────────────────────
  server.tool(
    "sac_widget_get_data",
    "Get widget data from a story.",
    {
      storyId: z.string().describe("Story ID"),
      widgetId: z.string().describe("Widget ID"),
      type: z.string().optional().default("kpiTile").describe("Widget type"),
    },
    async ({ storyId, widgetId, type }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery({ storyId, widgetId, type });
        const result = await sacGet(cfg, `/api/v1/widgetquery/getWidgetData${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

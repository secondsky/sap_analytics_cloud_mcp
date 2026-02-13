/**
 * Translation tools — Artifacts metadata, XLIFF download/upload
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError, buildODataQuery } from "./_helpers.js";

export function registerTranslationTools(server: McpServer): void {
  server.tool(
    "sac_translation_list_artifacts",
    "List translatable artifacts.",
    {
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N results"),
      $filter: z.string().optional().describe("OData filter"),
    },
    async (args) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(args as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `/api/v1/ts/artifacts/metadata${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_translation_get_artifact",
    "Get metadata for a translatable artifact.",
    {
      artifactId: z.string().describe("Artifact ID"),
    },
    async ({ artifactId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/ts/artifacts/${encodeURIComponent(artifactId)}/metadata`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_translation_download_xliff",
    "Download XLIFF translation file for an artifact.",
    {
      artifactId: z.string().describe("Artifact ID"),
    },
    async ({ artifactId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `/api/v1/ts/artifacts/${encodeURIComponent(artifactId)}/source/xliff`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_translation_download_xliff_bulk",
    "Download XLIFF files for multiple artifacts.",
    {
      body: z.record(z.string(), z.unknown()).describe("Bulk request with artifact IDs"),
    },
    async ({ body }) => {
      try {
        const cfg = getConfig();
        const result = await sacPost(cfg, "/api/v1/ts/artifacts/source/xliff", body);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

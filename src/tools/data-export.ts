/**
 * Data Export tools — Administration & Provider data
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost, sacDelete } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError, buildODataQuery } from "./_helpers.js";

const ADMIN = "/api/v1/dataexport/administration";
const PROVIDERS = "/api/v1/dataexport/providers";

export function registerDataExportTools(server: McpServer): void {

  // ── Namespaces ────────────────────────────────────────────────────

  server.tool(
    "sac_export_list_namespaces",
    "List data export namespaces (sac, sac_currency_tables, sac_public_dimensions, sac_unit_conversion).",
    {},
    async () => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `${ADMIN}/Namespaces`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_namespace",
    "Get namespace details.",
    {
      namespaceId: z.string().describe("Namespace ID"),
    },
    async ({ namespaceId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `${ADMIN}/Namespaces(NamespaceID='${namespaceId}')`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Providers ─────────────────────────────────────────────────────

  server.tool(
    "sac_export_list_providers",
    "List data providers (models) in a namespace.",
    {
      namespaceId: z.string().describe("Namespace ID"),
    },
    async ({ namespaceId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(
          cfg,
          `${ADMIN}/Namespaces(NamespaceID='${namespaceId}')/Providers`,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Subscriptions ─────────────────────────────────────────────────

  server.tool(
    "sac_export_list_subscriptions",
    "List all data export subscriptions.",
    {},
    async () => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `${ADMIN}/Subscriptions`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_subscription",
    "Get subscription by composite key.",
    {
      namespaceId: z.string().describe("Namespace ID"),
      providerId: z.string().describe("Provider ID"),
      subscriptionId: z.string().describe("Subscription ID"),
    },
    async ({ namespaceId, providerId, subscriptionId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(
          cfg,
          `${ADMIN}/Subscriptions(NamespaceID='${namespaceId}',ProviderID='${providerId}',SubscriptionID='${subscriptionId}')`,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_list_provider_subscriptions",
    "List subscriptions for a provider.",
    {
      namespaceId: z.string().describe("Namespace ID"),
      providerId: z.string().describe("Provider ID"),
    },
    async ({ namespaceId, providerId }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(
          cfg,
          `${ADMIN}/Providers(NamespaceID='${namespaceId}',ProviderID='${providerId}')/Subscriptions`,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_create_subscription",
    "Create data export subscription for delta tracking.",
    {
      NamespaceID: z.string().describe("Namespace ID"),
      ProviderID: z.string().describe("Provider ID"),
      EntitySetName: z.enum(["FactData", "FactDataDifference", "FactDataAggregation"])
        .describe("Entity set to track"),
      ExternalID: z.string().optional().describe("Unique external ID for subscription chain"),
      Filter: z.string().optional().describe("OData filter"),
      Selection: z.string().optional().describe("Comma-separated dims/measures for FactDataAggregation"),
      Description: z.string().optional().describe("Description"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ allowalteration, ...body }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        const requestBody: Record<string, string> = {
          NamespaceID: body.NamespaceID,
          ProviderID: body.ProviderID,
          EntitySetName: body.EntitySetName,
        };
        if (body.ExternalID) requestBody.ExternalID = body.ExternalID;
        if (body.Filter) requestBody.Filter = body.Filter;
        if (body.Selection) requestBody.Selection = body.Selection;
        if (body.Description) requestBody.Description = body.Description;

        const result = await sacPost(cfg, `${ADMIN}/Subscriptions`, requestBody);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_delete_subscription",
    "Delete data export subscription(s).",
    {
      namespaceId: z.string().describe("Namespace ID"),
      providerId: z.string().describe("Provider ID"),
      subscriptionId: z.string().optional().default("").describe("Subscription ID (empty = all for provider)"),
      deleteChain: z.boolean().optional().describe("Delete entire chain"),
      deleteEntitySetName: z.string().optional().describe("Delete all for this EntitySetName"),
      allowalteration: z.boolean().optional().describe("Must be true to execute"),
    },
    async ({ namespaceId, providerId, subscriptionId, deleteChain, deleteEntitySetName, allowalteration }) => {
      if (!allowalteration) {
        return toolError("Security Requirement: This operation changes data. Please confirm by calling again with 'allowalteration=true'.");
      }
      try {
        const cfg = getConfig();
        let path = `${ADMIN}/Subscriptions(NamespaceID='${namespaceId}',ProviderID='${providerId}',SubscriptionID='${subscriptionId ?? ""}')`;
        const params = new URLSearchParams();
        if (deleteChain) params.append("deleteChain", "true");
        if (deleteEntitySetName) params.append("deleteEntitySetName", deleteEntitySetName);
        const qs = params.toString();
        if (qs) path += `?${qs}`;

        await sacDelete(cfg, path);
        return toolSuccess({ deleted: true });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Admin Metadata ────────────────────────────────────────────────

  server.tool(
    "sac_export_admin_metadata",
    "Get OData metadata for admin service.",
    {
      $format: z.enum(["JSON", "xml"]).optional().describe("Response format"),
    },
    async ({ $format }) => {
      try {
        const cfg = getConfig();
        const qs = $format ? `?$format=${$format}` : "";
        const result = await sacGet(cfg, `${ADMIN}/$metadata${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Provider Metadata & Service Document ──────────────────────────

  server.tool(
    "sac_export_get_provider_metadata",
    "Get OData metadata (EDMX) for a provider.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $format: z.enum(["JSON", "xml"]).optional().describe("Response format"),
    },
    async ({ namespace, provider, $format }) => {
      try {
        const cfg = getConfig();
        const qs = $format ? `?$format=${$format}` : "";
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/$metadata${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_provider_entities",
    "List available entity sets for a provider.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
    },
    async ({ namespace, provider }) => {
      try {
        const cfg = getConfig();
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Fact Data ─────────────────────────────────────────────────────

  server.tool(
    "sac_export_get_fact_data",
    "Get fact data. Supports OData params, delta tracking (trackChanges/deltaid/externalid), CSV export.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $count: z.boolean().optional().describe("Include count"),
      $format: z.string().optional().describe("json or text/csv"),
      delimiter: z.string().optional().describe("CSV delimiter"),
      pagesize: z.number().optional().describe("Page size"),
      deltaid: z.string().optional().describe("Delta ID"),
      externalid: z.string().optional().describe("External ID"),
      trackChanges: z.boolean().optional().describe("Create subscription"),
    },
    async ({ namespace, provider, deltaid, externalid, trackChanges, delimiter, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const params = new URLSearchParams(qs ? qs.slice(1) : "");
        if (deltaid) params.set("deltaid", deltaid);
        if (externalid) params.set("externalid", externalid);
        if (delimiter) params.set("delimiter", delimiter);
        const queryString = params.toString() ? `?${params.toString()}` : "";

        const extraHeaders: Record<string, string> = {};
        if (trackChanges) extraHeaders["Prefer"] = "odata.track-changes";

        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/FactData${queryString}`, extraHeaders);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_fact_data_aggregation",
    "Get aggregated fact data. Use $select for dims/measures; rest aggregated. 'provider' is the model ID — if you only have a model name, resolve it first with sac_filerepository_list using $filter=name eq 'MODEL_NAME' and resourceType eq 'ANALYTIC_MODEL' (returns resourceId = model ID). Namespace for analytic models is 'sac'.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID (= model ID / resourceId)"),
      $select: z.string().describe("Required: comma-separated dims and measures"),
      $filter: z.string().optional().describe("OData filter"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $orderby: z.string().optional().describe("Order by"),
      $count: z.boolean().optional().describe("Include count"),
      $format: z.string().optional().describe("Response format"),
      deltaid: z.string().optional().describe("Delta ID"),
      trackChanges: z.boolean().optional().describe("Create subscription"),
    },
    async ({ namespace, provider, deltaid, trackChanges, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const params = new URLSearchParams(qs ? qs.slice(1) : "");
        if (deltaid) params.set("deltaid", deltaid);
        const queryString = params.toString() ? `?${params.toString()}` : "";

        const extraHeaders: Record<string, string> = {};
        if (trackChanges) extraHeaders["Prefer"] = "odata.track-changes";

        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/FactDataAggregation${queryString}`, extraHeaders);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_fact_data_difference",
    "Get measure value differences over subscription period. Requires trackChanges or deltaid.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $format: z.string().optional().describe("Response format"),
      deltaid: z.string().optional().describe("Delta ID"),
      trackChanges: z.boolean().optional().describe("Create subscription (initial load)"),
    },
    async ({ namespace, provider, deltaid, trackChanges, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const params = new URLSearchParams(qs ? qs.slice(1) : "");
        if (deltaid) params.set("deltaid", deltaid);
        const queryString = params.toString() ? `?${params.toString()}` : "";

        const extraHeaders: Record<string, string> = {};
        if (trackChanges) extraHeaders["Prefer"] = "odata.track-changes";

        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/FactDataDifference${queryString}`, extraHeaders);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Master Data ───────────────────────────────────────────────────

  server.tool(
    "sac_export_get_master_data",
    "Get master data and level-based hierarchies for all dimensions.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $count: z.boolean().optional().describe("Include count"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/MasterData${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_dimension_master",
    "Get master data for a single dimension ({DimensionName}Master entity set).",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      dimension: z.string().describe("Dimension name (e.g. Account, Region)"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, dimension, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/${dimension}Master${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_dimension_master_hierarchy",
    "Get master data with parent-child hierarchy for a dimension.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      dimension: z.string().describe("Dimension name"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, dimension, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/${dimension}MasterWithHierarchy${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Audit Data ────────────────────────────────────────────────────

  server.tool(
    "sac_export_get_audit_data",
    "Get audit data (change history). Requires Data Audit enabled on model.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $count: z.boolean().optional().describe("Include count"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/AuditData${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Currency & Unit Conversion ────────────────────────────────────

  server.tool(
    "sac_export_get_currency_table",
    "Get currency conversion rates. Namespace: sac_currency_tables.",
    {
      namespace: z.string().default("sac_currency_tables").describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/CurrencyTable${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "sac_export_get_conversion_rates",
    "Get unit conversion rates. Namespace: sac_unit_conversion.",
    {
      namespace: z.string().default("sac_unit_conversion").describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ namespace, provider, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/ConversionRates${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Public Dimensions ─────────────────────────────────────────────

  server.tool(
    "sac_export_get_public_dimension_data",
    "Get public dimension master data. Namespace: sac_public_dimensions.",
    {
      provider: z.string().describe("Provider ID"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $format: z.string().optional().describe("Response format"),
    },
    async ({ provider, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const result = await sacGet(cfg, `${PROVIDERS}/sac_public_dimensions/${provider}/PublicDimensionData${qs}`);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  // ── Generic Entity Set ────────────────────────────────────────────

  server.tool(
    "sac_export_get_data",
    "Generic: get data from any provider entity set. For Distinct queries use '{col}___Distinct'.",
    {
      namespace: z.string().describe("Namespace ID"),
      provider: z.string().describe("Provider ID"),
      entitySet: z.string().describe("Entity set name"),
      $top: z.number().optional().describe("Max results"),
      $skip: z.number().optional().describe("Skip N"),
      $filter: z.string().optional().describe("OData filter"),
      $select: z.string().optional().describe("Columns"),
      $orderby: z.string().optional().describe("Order by"),
      $count: z.boolean().optional().describe("Include count"),
      $format: z.string().optional().describe("Response format"),
      pagesize: z.number().optional().describe("Page size"),
      delimiter: z.string().optional().describe("CSV delimiter"),
      deltaid: z.string().optional().describe("Delta ID"),
      externalid: z.string().optional().describe("External ID"),
      trackChanges: z.boolean().optional().describe("Create subscription"),
    },
    async ({ namespace, provider, entitySet, deltaid, externalid, trackChanges, delimiter, pagesize, ...odata }) => {
      try {
        const cfg = getConfig();
        const qs = buildODataQuery(odata as Record<string, string | number | boolean | undefined>);
        const params = new URLSearchParams(qs ? qs.slice(1) : "");
        if (deltaid) params.set("deltaid", deltaid);
        if (externalid) params.set("externalid", externalid);
        if (delimiter) params.set("delimiter", delimiter);
        if (pagesize) params.set("pagesize", pagesize.toString());
        const queryString = params.toString() ? `?${params.toString()}` : "";

        const extraHeaders: Record<string, string> = {};
        if (trackChanges) extraHeaders["Prefer"] = "odata.track-changes";

        const result = await sacGet(cfg, `${PROVIDERS}/${namespace}/${provider}/${entitySet}${queryString}`, extraHeaders);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

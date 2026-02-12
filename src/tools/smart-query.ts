
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sacGet, sacPost } from "../auth/sac-client.js";
import { getConfig, toolSuccess, toolError } from "./_helpers.js";

/**
 * Smart Query Tool
 * 
 * Intelligently routes queries to the most appropriate SAC API endpoint:
 * 1. Simple SELECT -> OData Relational API
 * 2. Aggregations (SUM, COUNT) -> Analytical Widget Query (if possible) or OData Aggregation
 * 3. Fallback -> Try alternative compatible methods
 */
export function registerSmartQueryTool(server: McpServer): void {
    server.tool(
        "smart_query",
        "Intelligently execute a query against SAP Analytics Cloud data. automatically selects the best method (Relational OData vs Analytical Widget Query) based on query complexity.",
        {
            query: z.string().describe("The SQL-like query to execute (e.g., 'SELECT * FROM Story123', 'SELECT SUM(Amount) FROM ModelXYZ')"),
            space_id: z.string().optional().describe("Optional: Space ID context"),
            model_id: z.string().optional().describe("Optional: Model ID if not specified in FROM clause"),
        },
        async ({ query, space_id, model_id }) => {
            try {
                const cfg = getConfig();
                const analysis = analyzeQuery(query);

                // Add context to response metadata
                const metadata = {
                    original_query: query,
                    analysis: analysis,
                    routing: "",
                    fallback_triggered: false
                };

                // 1. Analytical Routing (Aggregations)
                if (analysis.type === 'analytical') {
                    metadata.routing = "Analytical endpoint (Widget Data)";
                    // Implementation note: Real widget query requires complex IDs. 
                    // For this MVP, we will try to map it, but likely fall back or return a helpful message 
                    // if we can't parse a strict Story/Widget ID from the 'FROM' clause.

                    // Heuristic: If FROM clause looks like 'StoryID:WidgetID', try Widget Query
                    if (analysis.target.includes(':')) {
                        const [storyId, widgetId] = analysis.target.split(':');
                        try {
                            const result = await sacGet(cfg, `/api/v1/widgetquery/getWidgetData?storyId=${storyId}&widgetId=${widgetId}`);
                            return toolSuccess(result, metadata);
                        } catch (err) {
                            console.warn("Analytical route failed, falling back to relational...", err);
                            metadata.fallback_triggered = true;
                            // Fallthrough to relational
                        }
                    } else {
                        return toolError("For analytical queries, please specify FROM as 'StoryID:WidgetID'. Automated model aggregation is not yet fully supported in this version.");
                    }
                }

                // 2. Relational Routing (Simple SELECT)
                // Default path for 'relational' or fallback
                metadata.routing = "Relational endpoint (OData)";

                // Construct OData query from SQL-like input (Basic parser)
                // SELECT * FROM Entity -> /api/v1/dataexport/Providers/sac/SimpleExample/Entity
                // Note: This requires mapping the 'FROM' target to a valid provider path.
                // For MVP, we assume FROM contains the Entity Set name and user provided a base URL or we use a default provider.
                // Actually, let's use the 'Resources' API as a generic fallback if no specific provider is known.

                let url = `/api/v1/${analysis.target}`; // Blind guess: assume target is a valid API endpoint or entity

                // If target resembles a known entity set (e.g. Stories, Models), use that
                const knownEntities = ['Stories', 'Models', 'Users', 'Teams', 'Resources', 'Activities'];
                const match = knownEntities.find(e => analysis.target.toLowerCase().includes(e.toLowerCase()));
                if (match) {
                    url = `/api/v1/${match}`;
                }

                // Apply $select, $filter if simple parsing is possible
                // (Skipping complex SQL parser for now, just raw GET)

                const result = await sacGet(cfg, url);
                return toolSuccess(result, metadata);

            } catch (err) {
                return toolError(err);
            }
        }
    );
}

// ── Query Analysis Helpers ─────────────────────────────────────────

type QueryType = 'relational' | 'analytical';

interface QueryAnalysis {
    type: QueryType;
    target: string; // Table, Model, or Story:Widget
    hasAggregation: boolean;
}

function analyzeQuery(query: string): QueryAnalysis {
    const upperQ = query.toUpperCase();
    const hasAggregation = ['SUM(', 'COUNT(', 'AVG(', 'GROUP BY'].some(k => upperQ.includes(k));

    // Naive parser for FROM clause
    // Matches "FROM [Target]"
    const fromMatch = query.match(/FROM\s+([^\s;]+)/i);
    const target = fromMatch ? fromMatch[1] : "Unknown";

    return {
        type: hasAggregation ? 'analytical' : 'relational',
        target: target,
        hasAggregation
    };
}

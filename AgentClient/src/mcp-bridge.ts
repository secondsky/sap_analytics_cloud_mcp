/**
 * MCP Bridge — Spawns the SAC MCP server as a child process,
 * connects via stdio, discovers tools, and executes them.
 *
 * Provider-agnostic: returns raw tool definitions.
 * Each LLM provider converts them to its own format.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpToolDef } from "./providers/types.js";

export class McpBridge {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: McpToolDef[] = [];

  /** Spawn the MCP server and connect over stdio. */
  async connect(serverPath: string, env: Record<string, string>): Promise<void> {
    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env,
      stderr: "inherit",
    });

    this.client = new Client({ name: "sac-agent-client", version: "0.1.0" });
    await this.client.connect(this.transport);

    // Discover all tools
    const result = await this.client.listTools();
    this.tools = result.tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  /** Return raw MCP tool definitions (provider-neutral). */
  getTools(): McpToolDef[] {
    return this.tools;
  }

  /** Number of discovered tools. */
  get toolCount(): number {
    return this.tools.length;
  }

  /** Execute a tool on the MCP server. Returns the text result. */
  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({ name, arguments: args });

    // Extract text from content blocks
    if ("content" in result && Array.isArray(result.content)) {
      return result.content
        .map((c: Record<string, unknown>) =>
          c.type === "text" ? (c.text as string) : JSON.stringify(c),
        )
        .join("\n");
    }

    return JSON.stringify(result);
  }

  /** Clean shutdown. */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
    }
  }
}

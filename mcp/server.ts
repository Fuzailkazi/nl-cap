import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  notesDocAppend,
  calendarHoldCreate,
  emailDraftGenerate,
} from "@/lib/mcp/tools.js";

/**
 * The labelled "MCP layer". This stdio server exposes the three tools to any
 * MCP client. Each tool ONLY enqueues a 'pending' approval_queue row via the
 * lib/mcp builders and returns the queued action id — it performs NO side
 * effect. Side effects happen exclusively when a human approves in the
 * Approval Centre. The Next.js app calls lib/mcp directly (not this server).
 *
 * Compliance: do not pass PII through these tools. Payloads are validated by
 * the contract zod schemas inside lib/mcp/queue.ts before any row is written.
 */

// The server runs as a standalone process; load local env for Supabase keys.
loadEnv({ path: ".env.local" });

function queuedText(actionId: number) {
  return {
    content: [
      { type: "text" as const, text: `Queued action ${actionId} (pending approval)` },
    ],
  };
}

export function buildServer(): McpServer {
  const server = new McpServer({
    name: "mutual-fund-advisor-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "notes_doc_append",
    {
      title: "Append to shared notes doc",
      description:
        "Queue an append to the advisor's shared notes doc. Enqueue-only: returns a pending action id; a human must approve before anything is written. No PII.",
      inputSchema: { content: z.string().min(1) },
    },
    async ({ content }) => {
      const { actionId } = await notesDocAppend(content);
      return queuedText(actionId);
    },
  );

  server.registerTool(
    "calendar_hold_create",
    {
      title: "Create a calendar hold",
      description:
        "Queue a calendar hold on a mock slot. Enqueue-only: returns a pending action id; a human must approve before the hold is created. No PII.",
      inputSchema: { slot: z.string().min(1), title: z.string().optional() },
    },
    async ({ slot, title }) => {
      const { actionId } = await calendarHoldCreate(slot, title);
      return queuedText(actionId);
    },
  );

  server.registerTool(
    "email_draft_generate",
    {
      title: "Generate an email draft",
      description:
        "Queue an email draft (subject + body) for review. Enqueue-only: returns a pending action id; a human must approve before the draft is stored. No PII.",
      inputSchema: { subject: z.string().min(1), body: z.string().min(1) },
    },
    async ({ subject, body }) => {
      const { actionId } = await emailDraftGenerate(subject, body);
      return queuedText(actionId);
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is the MCP protocol channel.
  console.error("mutual-fund-advisor MCP server running on stdio");
}

main().catch((err) => {
  console.error("MCP server fatal error:", err);
  process.exit(1);
});

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function abs(rel: string): string {
  return join(ROOT, rel);
}

export function exists(rel: string): boolean {
  return existsSync(abs(rel));
}

export function read(rel: string): string {
  return readFileSync(abs(rel), "utf8");
}

export function readIfPresent(rel: string): string | null {
  return exists(rel) ? read(rel) : null;
}

/** Recursively collect file paths under `rel`, skipping node_modules/.git/.next. */
export function listFiles(rel = ".", acc: string[] = []): string[] {
  const dir = abs(rel);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
    const child = rel === "." ? name : join(rel, name);
    const st = statSync(abs(child));
    if (st.isDirectory()) listFiles(child, acc);
    else acc.push(child);
  }
  return acc;
}

export const ISSUE_TRACK3 =
  "github_issues/3-Track MCP server entry point (Victorrent)/00_description.md";
export const ISSUE_12 =
  "github_issues/3-Track MCP server entry point (Victorrent)/12-Phase 4 — Academic Agent (Python).md";
export const ISSUE_13 =
  "github_issues/3-Track MCP server entry point (Victorrent)/13-Phase 5 — MCP Server.md";
export const PLAN = "plans/2032e2-agentic-graph-search.md";
export const SPEC = "specs/2032e2-agentic-graph-search.md";
export const ADR0001 = "docs/adr/0001-compose-cursor-retrieval.md";
export const ADR0002 = "docs/adr/0002-grok-retrieval-reasoning-adapter.md";
export const ADR0003 = "docs/adr/0003-langfuse-optional-not-langchain.md";
export const CONTEXT = "CONTEXT.md";


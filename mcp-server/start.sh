#!/bin/sh
# Stdio MCP entry: load GROK_API_KEY from Keychain if unset, then run the server.
# Cursor should spawn this script, not paste the key into mcp.json.
set -e
cd "$(dirname "$0")/.."
if [ -z "$GROK_API_KEY" ]; then
  GROK_API_KEY=$(security find-generic-password -a "$USER" -s "xai_api" -w)
  export GROK_API_KEY
fi
exec npx tsx --tsconfig tsconfig.json mcp-server/index.ts

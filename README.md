# horizen-mcp

An [MCP server](https://modelcontextprotocol.io) that gives coding agents accurate, sourced facts about the Horizen chain — so they stop guessing.

When you ask an agent to deploy a contract on Horizen, configure a bridge, or integrate Stork oracle, it needs ground truth: the right chain ID, the right RPC URL, the right contract address. This server provides that — typed, versioned, with explicit provenance on every value. If something isn't in the registry, the agent is told so explicitly rather than making something up.

---

## Quickstart

### Claude Code

Add to `~/.claude/claude_desktop_config.json` (or your project's `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "horizen": {
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  }
}
```

### Claude Desktop

Same config file as Claude Code — `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "horizen": {
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "horizen": {
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "horizen": {
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  }
}
```

### Cline (VS Code)

Open the Cline extension → **MCP Servers** tab → **Edit MCP Settings** → add:

```json
{
  "mcpServers": {
    "horizen": {
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  }
}
```

### Continue (VS Code / JetBrains)

Add to `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "horizen",
      "command": "npx",
      "args": ["-y", "horizen-mcp"]
    }
  ]
}
```

### Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "horizen": {
      "command": {
        "path": "npx",
        "args": ["-y", "horizen-mcp"]
      }
    }
  }
}
```

Restart your editor after saving. The server starts on demand — no separate process to manage.

---

## What you can ask

Once connected, your agent has access to Horizen chain facts through natural language:

**Network info**
> "What's the Horizen mainnet chain ID and RPC URL?"
> "Give me the testnet explorer URL for Horizen."

**Contract addresses**
> "What's the Stork oracle address on Horizen?"
> "What's the PureFi verifier proxy address I should integrate against?"
> "Is Uniswap deployed on Horizen mainnet?"

**Oracle feeds**
> "What's the Stork feed ID for ETHUSD on Horizen?"
> "How do I derive a Stork feed ID for a custom asset?"

**Bridges**
> "How do I bridge assets to Horizen?"
> "Does Stargate support ETH on Horizen?"

**Integrations**
> "How do I integrate Stork oracle on Horizen?"
> "Can I use Den from the command line, or is it browser-only?"
> "Where are the Goldsky indexing docs for Horizen?"

**Docs search**
> "Search the Horizen docs for compliance gating."
> "Find the Horizen tutorial for setting up a multisig."

---

## Tools

| Tool | What it does |
|---|---|
| `get_chain_info` | Chain ID, RPC/WS URLs, explorer, gas token, settlement layer for mainnet or testnet |
| `get_contract_address` | Verified address for a given contract + network. Returns explicit not-found on miss — never fabricates. |
| `list_contracts` | All contracts in the registry with per-network deployment status |
| `get_stork_feed_id` | Stork oracle feed ID for an asset (e.g. `ETHUSD`), computed via keccak256 |
| `get_bridge_info` | Bridge URLs, supported assets, and caveats — native bridge vs. Stargate |
| `get_integration_info` | Docs paths, access method, status for Stork, Goldsky, PureFi, Den |
| `search_docs` | Live search across [docs.horizen.io](https://docs.horizen.io) with title, URL, and excerpt |

Every response includes a `source` field and a `verified` date. If a value isn't in the registry, the agent gets an explicit not-found with a list of what is known — never a guess.

---

## Run from source

```bash
git clone https://github.com/horizenio/horizen-mcp
cd horizen-mcp
npm install
npm run build
node dist/index.js
```

To point your editor at a local build instead of npm:

```json
{
  "mcpServers": {
    "horizen": {
      "command": "node",
      "args": ["/path/to/horizen-mcp/dist/index.js"]
    }
  }
}
```

---

## Development

```bash
npm run dev        # watch mode — recompiles on save
npm run inspect    # MCP Inspector UI for interactive tool testing
```

The Inspector lets you call any tool directly and inspect the full JSON response before connecting to an editor.

---

## Data

All facts live in [`data/chain-facts.json`](data/chain-facts.json). Tool handlers query this file — nothing is hardcoded in source. To update a value, edit that file and run `npm run build`.

Every entry carries a `source` (URL or attribution) and a `verified` date. Values that haven't been confirmed are left as `null` rather than guessed — the tool will tell the agent the value is unknown rather than returning something fabricated.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add contracts, integrations, or tools.

---

## License

MIT

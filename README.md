# horizen-mcp

Horizen chain reference data for coding agents — an [MCP](https://modelcontextprotocol.io) server.

When a developer asks an agent to "deploy a contract on Horizen testnet," the agent needs machine-queryable ground truth: chain ID, RPC URL, explorer URL, contract addresses, integration facts. This server provides exactly that — typed, versioned, with explicit provenance on every value.

---

## Tools

| Tool | Description |
|---|---|
| `get_chain_info` | Network metadata: chain ID, RPC/WS URLs, explorer, gas token, settlement layer |
| `get_contract_address` | Verified contract address for a given contract + network. Explicit not-found on miss — never fabricates. |
| `list_contracts` | All contracts in the registry with per-network deployment status |
| `get_stork_feed_id` | Stork oracle feed ID for an asset (e.g. `ETHUSD`), computed via keccak256 |
| `get_bridge_info` | Bridge URLs and caveats (native Caldera bridge vs. Stargate; ETH not supported on Stargate) |
| `get_integration_info` | Integration metadata: Stork, Goldsky, PureFi, Den — category, status, access method, docs paths |
| `search_docs` | Search [docs.horizen.io](https://docs.horizen.io) and return matching sections with URLs and excerpts |

Every response includes a `source` field and a `verified` date. Values not in the registry are returned as explicit not-found — never guessed.

---

## Quickstart

### Use with Claude Code (recommended)

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json` or project `.claude/mcp.json`):

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

### Use with Cursor / Windsurf

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

### Run locally from source

```bash
git clone https://github.com/horizenio/horizen-mcp
cd horizen-mcp
npm install
npm run build
node dist/index.js
```

---

## Development

```bash
npm install
npm run build       # compile TypeScript
npm run dev         # watch mode
npm run inspect     # open MCP Inspector for interactive testing
```

### Run acceptance tests

These are the spec's critical tests — run them as prompts through a connected MCP client:

| # | Prompt | Expected |
|---|---|---|
| 1 | "What's the Stork oracle address on Horizen testnet?" | `0xacC0...4fd62`, source = docs.stork.network |
| 2 | "What chain ID is Horizen mainnet?" | `26514`, explicitly labelled mainnet |
| 3 | "What's the ETHUSD feed ID for Stork?" | `0x59102b...817160` + derivation note |
| 4 | "How do I bridge ETH to Horizen with Stargate?" | States ETH is **not** supported; points to native bridge |
| 5 | "What's the PureFi verifier address on Horizen testnet?" | "Not deployed on testnet" — no mainnet address returned |
| 6 | "What's the Uniswap router address on Horizen?" | Explicit not-found + known keys — **no fabrication** |
| 7 | "Can I use Den from the command line?" | No — hosted UI only; Safe Protocol Kit is the programmatic path |
| 8 | "What's the Horizen block explorer?" | `explorer.horizen.io` — no Caldera domain returned |

Tests 5, 6, and 8 are the important ones. A server that fabricates on a miss, or cross-contaminates networks, or returns a deprecated domain is worse than no server.

---

## Data

All facts live in [`data/chain-facts.json`](data/chain-facts.json). Tool handlers query this file — nothing is hardcoded in the source. To update a chain fact, edit that file and rebuild.

Each entry carries a `source` (URL or attribution) and a `verified` date. Unverified values are left as `null` rather than guessed.

### Verified facts (as of 2026-07-21)

| Fact | Value |
|---|---|
| Mainnet chain ID | `26514` |
| Testnet chain ID | `2651420` |
| Mainnet RPC | `https://horizen.calderachain.xyz/http` |
| Testnet RPC | `https://horizen-testnet.rpc.caldera.xyz/http` |
| Mainnet explorer | `https://explorer.horizen.io/` |
| Testnet explorer | `https://explorer-testnet.horizen.io/` |
| Stork oracle (both networks) | `0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62` |
| ETHUSD feed ID | `0x59102b37de83bdda9f38ac8254e596f0d9ac61d2035c07936675e87342817160` |
| PureFi verifier proxy (mainnet) | `0x681Edd4906e2a0a277E2A6c394A4595f83e1329c` |

---

## Scope

This is a **reference data server**. It does not:

- Construct, sign, or broadcast transactions
- Read live on-chain state (balances, contract state, block height)
- Provide Vela tooling

v2 will add live RPC reads and Streamable HTTP transport for a hosted zero-install server.

---

## License

MIT

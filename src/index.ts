#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { chainInputSchema, handleGetChainInfo } from "./tools/chain.js";
import {
  contractInputSchema,
  handleGetContractAddress,
  handleListContracts,
} from "./tools/contracts.js";
import { feedInputSchema, handleGetStorkFeedId } from "./tools/feeds.js";
import { bridgeInputSchema, handleGetBridgeInfo } from "./tools/bridge.js";
import {
  integrationInputSchema,
  handleGetIntegrationInfo,
} from "./tools/integrations.js";
import { searchInputSchema, handleSearchDocs } from "./tools/search.js";

const SERVER_INSTRUCTIONS = `Horizen chain reference data. All values include \`source\` and \`verified\` fields — surface them when reporting facts to the user. This server returns reference data only; it does not construct, sign, or broadcast transactions. Values not present in this server must not be inferred — query again with different parameters, or tell the user the value is unavailable. Some integrations are live on Horizen but not yet documented in Horizen's own docs. For these, referencePath and tutorialPath are null while status is "live". Report these as available-but-undocumented and direct the user to externalDocs. Never construct a docs.horizen.io URL that is not present in this registry.`;

const server = new McpServer({
  name: "horizen-mcp",
  version: "0.1.0",
});

server.tool(
  "get_chain_info",
  "Get Horizen network metadata: chain ID, RPC URL, explorer URL, gas token, settlement layer.",
  chainInputSchema.shape,
  async (input) => {
    const result = handleGetChainInfo(input as { network: "mainnet" | "testnet" });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_contract_address",
  "Get a verified contract address on Horizen mainnet or testnet. Returns explicit not-found when unavailable — never guesses.",
  contractInputSchema.shape,
  async (input) => {
    const result = handleGetContractAddress(input as { contract: string; network: "mainnet" | "testnet" });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_contracts",
  "List all contracts in the registry with their display names and which networks they are deployed on.",
  {},
  async () => {
    const result = handleListContracts();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_stork_feed_id",
  "Compute the Stork oracle feed ID for an asset (e.g. ETHUSD). Derived via keccak256(assetId). Returns verified flag for known IDs.",
  feedInputSchema.shape,
  async (input) => {
    const result = handleGetStorkFeedId(input as { assetId: string });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_bridge_info",
  "Get bridge information for Horizen. Covers the native Caldera bridge and Stargate (LayerZero OFT). Always includes caveats about ETH/Stargate limitations.",
  bridgeInputSchema.shape,
  async (input) => {
    const result = handleGetBridgeInfo(input as { network?: "mainnet" | "testnet"; bridge?: string });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_integration_info",
  "Get details about a Horizen integration (stork, goldsky, purefi, den, zkverify) — category, status, supported networks, access method, and docs paths.",
  integrationInputSchema.shape,
  async (input) => {
    const result = handleGetIntegrationInfo(input as { integration?: string });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "search_docs",
  "Search the Horizen documentation at docs.horizen.io. Returns matching sections with titles, URLs, and excerpts.",
  searchInputSchema.shape,
  async (input) => {
    const result = await handleSearchDocs(input as { query: string; limit: number });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

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
import { storkPriceInputSchema, handleFetchStorkPrice } from "./tools/stork.js";
import {
  zkVerifyStatusInputSchema,
  handleCheckZkVerifyStatus,
} from "./tools/zkverify.js";
import { tokenInputSchema, handleGetTokenInfo } from "./tools/tokens.js";

const SERVER_INSTRUCTIONS = `Horizen chain reference data. All values include \`source\` and \`verified\` fields — surface them when reporting facts to the user. This server returns reference data only; it does not construct, sign, or broadcast transactions. Values not present in this server must not be inferred — query again with different parameters, or tell the user the value is unavailable. Some integrations are live on Horizen but not yet documented in Horizen's own docs. For these, referencePath and tutorialPath are null while status is "live". Report these as available-but-undocumented and direct the user to externalDocs. Never construct a docs.horizen.io URL that is not present in this registry.`;

const server = new McpServer({
  name: "horizen-mcp",
  version: "0.2.0",
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
  "fetch_stork_price",
  "Perform an authenticated pull from the Stork REST API to get a live signed price update for an asset. Returns the full signed payload with each field annotated with its correct Solidity type (timestampNs as uint64 in nanoseconds; quantizedValue as int192 — not uint256). Use the solidityCallData field directly when constructing an updateTemporalNumericValueV1 call.",
  storkPriceInputSchema.shape,
  async (input) => {
    const result = await handleFetchStorkPrice(
      input as { assetId: string; apiKey: string; baseUrl?: string }
    );
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "check_zkverify_status",
  "Check whether a zkVerify proof aggregation has been posted to Horizen by reading the zkVerify aggregation proxy contract. Two modes: (1) existence check — provide domainId and aggregationId only; reads proofsAggregations(domainId, aggregationId) and returns the Merkle root if posted; (2) full verification — also provide leaf, merklePath, leafCount, and index to call verifyProofAggregation(domainId, aggregationId, leaf, merklePath, leafCount, index) and get a definitive on-chain bool. Supports both mainnet (0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69) and testnet (0x3098A6974649478f0133046e44105AA84e868C21).",
  zkVerifyStatusInputSchema.shape,
  async (input) => {
    const result = await handleCheckZkVerifyStatus(
      input as {
        domainId: string;
        aggregationId: string;
        network?: "mainnet" | "testnet";
        leaf?: string;
        merklePath?: string[];
        leafCount?: string;
        index?: string;
      }
    );
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_token_info",
  "Get token addresses and specs for tokens on Horizen: ZEN (governance, 18 decimals), cbBTC (Coinbase Bitcoin, 8 decimals — NOT 18), USDC.e (bridged USDC, 6 decimals). Returns Horizen address plus cross-chain addresses (Base, Base Sepolia). Omit token to list all tokens with their decimals.",
  tokenInputSchema.shape,
  async (input) => {
    const result = handleGetTokenInfo(input as { token?: string; network?: "mainnet" | "testnet" });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

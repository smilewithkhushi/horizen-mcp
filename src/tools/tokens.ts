import { z } from "zod";
import { getToken, getKnownTokenKeys } from "../registry.js";

export const tokenInputSchema = z.object({
  token: z.enum(["zen", "cbtc", "usdce"]).optional().describe(
    "Token key: zen (ZEN governance token), cbtc (cbBTC — Coinbase Bitcoin, 8 decimals), usdce (USDC.e — bridged USDC, 6 decimals). Omit to list all tokens."
  ),
  network: z.enum(["mainnet", "testnet"]).optional().default("mainnet").describe(
    "Which network's addresses to return. Defaults to mainnet."
  ),
});

export function handleGetTokenInfo(input: { token?: string; network?: "mainnet" | "testnet" }) {
  const network = input.network ?? "mainnet";

  if (!input.token) {
    const keys = getKnownTokenKeys();
    return {
      tokens: keys.map((key) => {
        const entry = getToken(key)!;
        const netData = network === "mainnet" ? entry.mainnet : entry.testnet;
        return {
          key,
          displayName: entry.displayName,
          symbol: entry.symbol,
          decimals: entry.decimals,
          ...(entry.decimalsWarning ? { decimalsWarning: entry.decimalsWarning } : {}),
          horizenAddress: netData?.horizen ?? null,
          deployedOnNetwork: netData !== null,
        };
      }),
      decimalsNote:
        "Token decimals vary: ZEN=18, cbBTC=8, USDC.e=6. Never assume 18 decimals. Always check the decimals field before performing arithmetic.",
    };
  }

  const entry = getToken(input.token);
  const knownKeys = getKnownTokenKeys();

  if (!entry) {
    return {
      found: false,
      error: `Token "${input.token}" not in registry.`,
      knownTokens: knownKeys,
    };
  }

  const netData = network === "mainnet" ? entry.mainnet : entry.testnet;

  if (netData === null) {
    return {
      found: false,
      token: input.token,
      displayName: entry.displayName,
      network,
      error: `${entry.displayName} has no ${network} deployment per current documentation.`,
      note: entry.testnetNote ?? undefined,
      source: entry.source,
      verified: entry.verified,
    };
  }

  return {
    found: true,
    token: input.token,
    displayName: entry.displayName,
    symbol: entry.symbol,
    decimals: entry.decimals,
    ...(entry.decimalsWarning ? { decimalsWarning: entry.decimalsWarning } : {}),
    role: entry.role,
    bridge: entry.bridge,
    network,
    addresses: netData,
    ...(entry.upgradeNote ? { upgradeNote: entry.upgradeNote } : {}),
    source: entry.source,
    verified: entry.verified,
  };
}

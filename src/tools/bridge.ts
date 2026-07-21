import { z } from "zod";
import { getBridge, registry } from "../registry.js";
import type { Network } from "../types.js";

export const bridgeInputSchema = z.object({
  network: z.enum(["mainnet", "testnet"]).optional(),
  bridge: z.enum(["native", "stargate"]).optional(),
});

const CAVEATS = [
  "The native Caldera bridge and Stargate are distinct products with different token support and timing characteristics.",
  "ETH is NOT currently supported via Stargate on Horizen.",
  "The product is 'Stargate', not 'Stargate V2'.",
];

export function handleGetBridgeInfo(input: {
  network?: Network;
  bridge?: string;
}) {
  const bridgeKey = input.bridge;

  if (bridgeKey) {
    const entry = getBridge(bridgeKey);
    if (!entry) {
      return {
        found: false,
        error: `Bridge "${bridgeKey}" not found. Known bridges: native, stargate.`,
        caveats: CAVEATS,
      };
    }

    const result: Record<string, unknown> = {
      found: true,
      bridge: bridgeKey,
      ...entry,
      caveats: CAVEATS,
    };

    if (input.network === "mainnet" && entry.mainnetUrl) {
      result.url = entry.mainnetUrl;
    } else if (input.network === "testnet" && entry.testnetUrl) {
      result.url = entry.testnetUrl;
    }

    return result;
  }

  const native = registry.bridges.native;
  const stargate = registry.bridges.stargate;

  return {
    bridges: {
      native: {
        ...native,
        url: input.network === "testnet" ? native.testnetUrl : native.mainnetUrl,
      },
      stargate,
    },
    caveats: CAVEATS,
  };
}

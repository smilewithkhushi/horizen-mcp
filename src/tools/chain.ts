import { z } from "zod";
import { getNetwork, getRegistry } from "../registry.js";
import type { Network } from "../types.js";

export const chainInputSchema = z.object({
  network: z.enum(["mainnet", "testnet"]),
});

export function handleGetChainInfo(input: { network: Network }) {
  const net = getNetwork(input.network);
  const registry = getRegistry();

  return {
    network: input.network,
    ...net,
    registryLastVerified: registry.lastVerified,
    caveat:
      `Chain IDs: mainnet is 26514, testnet is 2651420. These are visually similar — ` +
      `the data above is for ${input.network} (chainId: ${net.chainId}).`,
  };
}

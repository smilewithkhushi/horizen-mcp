import { z } from "zod";
import { getContract, getKnownContractKeys } from "../registry.js";
import type { Network } from "../types.js";

export const contractInputSchema = z.object({
  contract: z.string(),
  network: z.enum(["mainnet", "testnet"]),
});

export function handleGetContractAddress(input: {
  contract: string;
  network: Network;
}) {
  const entry = getContract(input.contract);
  const knownKeys = getKnownContractKeys();

  if (!entry) {
    return {
      found: false,
      error: `Contract "${input.contract}" is not in the registry.`,
      knownContracts: knownKeys,
    };
  }

  const address = entry[input.network];

  if (address === null) {
    return {
      found: false,
      contract: input.contract,
      displayName: entry.displayName,
      network: input.network,
      error: `${entry.displayName} is not deployed on ${input.network} per current documentation. Do not use the ${input.network === "testnet" ? "mainnet" : "testnet"} address as a substitute.`,
      notes: entry.notes,
      source: entry.source,
    };
  }

  return {
    found: true,
    contract: input.contract,
    displayName: entry.displayName,
    network: input.network,
    address,
    notes: entry.notes,
    source: entry.source,
    verified: entry.verified,
  };
}

export function handleListContracts() {
  const knownKeys = getKnownContractKeys();

  return {
    contracts: knownKeys.map((key) => {
      const entry = getContract(key)!;
      return {
        key,
        displayName: entry.displayName,
        deployedOn: {
          mainnet: entry.mainnet !== null,
          testnet: entry.testnet !== null,
        },
      };
    }),
  };
}

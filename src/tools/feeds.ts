import { z } from "zod";
import { keccak256, toBytes } from "viem";
import { getFeed, getKnownFeedIds } from "../registry.js";

export const feedInputSchema = z.object({
  assetId: z.string().regex(/^[A-Z0-9]+$/, "assetId must be uppercase alphanumeric, e.g. ETHUSD"),
});

export function handleGetStorkFeedId(input: { assetId: string }) {
  const computed = keccak256(toBytes(input.assetId));
  const derivation = `keccak256("${input.assetId}")`;

  const registryEntry = getFeed(input.assetId);
  const knownIds = getKnownFeedIds();

  if (registryEntry) {
    const matches = registryEntry.id.toLowerCase() === computed.toLowerCase();
    return {
      assetId: input.assetId,
      feedId: registryEntry.id,
      derivation,
      verified: true,
      crossChecked: matches,
      source: registryEntry.source,
      verifiedDate: registryEntry.verified,
      note: matches
        ? "Feed ID is confirmed: computed value matches the registry entry."
        : "WARNING: computed value does not match registry entry — registry may need updating.",
    };
  }

  return {
    assetId: input.assetId,
    feedId: computed,
    derivation,
    verified: false,
    note: `This feed ID was computed via ${derivation} but has not been cross-checked against a Stork API response. Verified feed IDs: ${knownIds.join(", ")}.`,
    source: "Computed — not in registry",
  };
}

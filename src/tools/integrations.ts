import { z } from "zod";
import { getIntegration, getKnownIntegrationKeys } from "../registry.js";

export const integrationInputSchema = z.object({
  integration: z.enum(["stork", "goldsky", "purefi", "den"]).optional(),
});

export function handleGetIntegrationInfo(input: { integration?: string }) {
  if (input.integration) {
    const entry = getIntegration(input.integration);
    const knownKeys = getKnownIntegrationKeys();

    if (!entry) {
      return {
        found: false,
        error: `Integration "${input.integration}" not found.`,
        knownIntegrations: knownKeys,
      };
    }

    return {
      found: true,
      integration: input.integration,
      ...entry,
      docsBaseUrl: "https://docs.horizen.io",
      referenceUrl: `https://docs.horizen.io${entry.referencePath}`,
      tutorialUrl: `https://docs.horizen.io${entry.tutorialPath}`,
    };
  }

  const keys = getKnownIntegrationKeys();
  return {
    integrations: keys.map((key) => {
      const entry = getIntegration(key)!;
      return {
        key,
        displayName: entry.displayName,
        category: entry.category,
        status: entry.status,
        networks: entry.networks,
        accessMethod: entry.accessMethod,
        referenceUrl: `https://docs.horizen.io${entry.referencePath}`,
        tutorialUrl: `https://docs.horizen.io${entry.tutorialPath}`,
      };
    }),
  };
}

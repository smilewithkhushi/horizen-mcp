import { z } from "zod";
import { getIntegration, getKnownIntegrationKeys } from "../registry.js";

export const integrationInputSchema = z.object({
  integration: z.enum(["stork", "goldsky", "purefi", "den", "zkverify"]).optional(),
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

    const referenceUrl = entry.referencePath
      ? `https://docs.horizen.io${entry.referencePath}`
      : null;
    const tutorialUrl = entry.tutorialPath
      ? `https://docs.horizen.io${entry.tutorialPath}`
      : null;

    return {
      found: true,
      integration: input.integration,
      ...entry,
      docsBaseUrl: "https://docs.horizen.io",
      referenceUrl,
      tutorialUrl,
      ...(entry.referencePath === null && entry.status === "live"
        ? {
            documentationNote:
              "This integration is live on Horizen but not yet documented in Horizen's own docs. Refer to externalDocs for integration guidance. Do not construct a docs.horizen.io URL for this integration.",
          }
        : {}),
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
        referenceUrl: entry.referencePath
          ? `https://docs.horizen.io${entry.referencePath}`
          : null,
        tutorialUrl: entry.tutorialPath
          ? `https://docs.horizen.io${entry.tutorialPath}`
          : null,
      };
    }),
  };
}

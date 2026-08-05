import { z } from "zod";
import { keccak256, toBytes } from "viem";
import { getFeed } from "../registry.js";

export const storkPriceInputSchema = z.object({
  assetId: z.string().regex(/^[A-Z0-9]+$/, "assetId must be uppercase alphanumeric, e.g. ETHUSD"),
  apiKey: z.string().min(1, "Stork API key is required for authenticated price fetch"),
  baseUrl: z
    .string()
    .url("baseUrl must be a valid URL")
    .optional()
    .describe("Stork REST API base URL. Defaults to https://rest.jp.stork-oracle.network"),
});

// Source: https://docs.stork.network/api-reference/rest-api.md
// Confirmed shape of stork_signed_price from the official REST API reference.
// The signature and timestamp are nested inside timestamped_signature — NOT flat on the object.
interface StorkSignedPrice {
  public_key: string;
  encoded_asset_id: string;
  // Stork docs: "price is returned as a string, quantized (multiplied by 10^18)"
  price: string;
  publisher_merkle_root: string;
  calculation_alg: {
    type: string;
    version: string;
    checksum: string;
  };
  // Confirmed nested structure from official REST API docs
  timestamped_signature: {
    // UNIX nanosecond timestamp — uint64 on-chain
    timestamp: number;
    signature: {
      r: string;
      s: string;
      // API returns v as a string ("27" or "28"); cast to Number/uint8 before ABI encoding
      v: string;
    };
    msg_hash: string;
  };
}

interface StorkApiAsset {
  timestamp: number;
  asset_id: string;
  signature_type: string;
  price: string;
  stork_signed_price: StorkSignedPrice;
}

interface StorkApiResponse {
  data: Record<string, StorkApiAsset>;
}

// Stork docs state prices are always "quantized (multiplied by 10^18)".
// There is no per-response quantization_factor field in the API — 18 decimals is fixed.
// Source: https://docs.stork.network/api-reference/rest-api.md
const STORK_PRICE_DECIMALS = 18n;
const STORK_PRICE_FACTOR = 10n ** STORK_PRICE_DECIMALS;

function formatPrice(rawPrice: string): string {
  try {
    const price = BigInt(rawPrice);
    const integer = price / STORK_PRICE_FACTOR;
    const remainder = price % STORK_PRICE_FACTOR;
    return `${integer}.${remainder.toString().padStart(Number(STORK_PRICE_DECIMALS), "0")}`;
  } catch {
    return rawPrice;
  }
}

export async function handleFetchStorkPrice(input: {
  assetId: string;
  apiKey: string;
  baseUrl?: string;
}) {
  const baseUrl = input.baseUrl ?? "https://rest.jp.stork-oracle.network";
  const url = `${baseUrl}/v1/prices/latest?assets=${encodeURIComponent(input.assetId)}`;

  // Compute feed ID locally for cross-check — keccak256(assetId as UTF-8 bytes)
  const computedFeedId = keccak256(toBytes(input.assetId));
  const registryEntry = getFeed(input.assetId);

  // Stork REST API uses HTTP Basic auth: apiKey as username, empty password.
  // Source: https://docs.stork.network/api-reference/rest-api.md
  const credentials = Buffer.from(`${input.apiKey}:`).toString("base64");
  const authHeader = `Basic ${credentials}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });
  } catch (err) {
    return {
      success: false,
      error: `Network error contacting Stork API: ${(err as Error).message}`,
      endpoint: url,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: `Stork API returned HTTP ${response.status}: ${response.statusText}`,
      endpoint: url,
      hint:
        response.status === 401
          ? "Invalid API key — check your Stork API key at https://app.stork.network"
          : response.status === 404
          ? `Asset "${input.assetId}" not found on Stork. Verify the asset ID is supported.`
          : undefined,
    };
  }

  let body: StorkApiResponse;
  try {
    body = (await response.json()) as StorkApiResponse;
  } catch {
    return {
      success: false,
      error: "Failed to parse Stork API response as JSON",
      endpoint: url,
    };
  }

  const assetData = body.data?.[input.assetId];
  if (!assetData) {
    return {
      success: false,
      error: `No data returned for asset "${input.assetId}"`,
      availableAssets: Object.keys(body.data ?? {}),
      endpoint: url,
    };
  }

  const sp = assetData.stork_signed_price;

  // Timestamp lives at stork_signed_price.timestamped_signature.timestamp (UNIX nanoseconds).
  // Use BigInt to avoid JS float64 precision loss — JSON.parse silently rounds uint64.
  const timestampNsBig = BigInt(sp.timestamped_signature.timestamp);
  const timestampSec = Number(timestampNsBig / 1_000_000_000n);

  const feedIdMatchesComputed =
    sp.encoded_asset_id.toLowerCase() === computedFeedId.toLowerCase();
  const feedIdMatchesRegistry = registryEntry
    ? sp.encoded_asset_id.toLowerCase() === registryEntry.id.toLowerCase()
    : null;

  // valueComputeAlgHash = calculation_alg.checksum from the API response.
  // Maps to the valueComputeAlgHash bytes32 field in TemporalNumericValueInput.
  const valueComputeAlgHash = sp.calculation_alg?.checksum ?? null;

  // Signature fields are at stork_signed_price.timestamped_signature.signature.{r,s,v}.
  // v is returned as a string by the API ("27" or "28"); Number() converts to uint8 for ABI encoding.
  const sig = sp.timestamped_signature.signature;

  return {
    success: true,
    assetId: input.assetId,

    // Feed ID cross-check
    feedId: {
      fromApi: sp.encoded_asset_id,
      computed: computedFeedId,
      matchesComputed: feedIdMatchesComputed,
      matchesRegistry: feedIdMatchesRegistry,
      warning: !feedIdMatchesComputed
        ? "Feed ID from API does not match keccak256(assetId) — do not use this ID in your contract call."
        : undefined,
    },

    // Human-readable price. Stork prices are always 10^18-scaled; no per-response factor.
    // Source: https://docs.stork.network/api-reference/rest-api.md
    price: {
      humanReadable: formatPrice(sp.price),
      quantized: sp.price,
      decimals: 18,
    },

    // Timestamp — most common source of bugs
    timestamp: {
      // Raw nanosecond string (read from timestamped_signature.timestamp)
      timestampNs: sp.timestamped_signature.timestamp.toString(),
      timestampSec,
      iso: new Date(timestampSec * 1000).toISOString(),
      criticalNote:
        "The on-chain field is timestampNs (nanoseconds). Pass as BigInt() directly — do NOT divide by 1e9. JSON.parse() silently rounds uint64 to float64 — always use BigInt(response.timestampNs).",
    },

    // Correct Solidity struct layout for updateTemporalNumericValuesV1.
    //
    // Source: StorkStructs.sol — github.com/Stork-Oracle/stork-external
    //   chains/evm/sdks/stork_evm_sdk/StorkStructs.sol (verified 2025-08-05)
    //
    // struct TemporalNumericValueInput {
    //   TemporalNumericValue temporalNumericValue;
    //   bytes32 id;
    //   bytes32 publisherMerkleRoot;
    //   bytes32 valueComputeAlgHash;
    //   bytes32 r;
    //   bytes32 s;
    //   uint8 v;
    // }
    // struct TemporalNumericValue { uint64 timestampNs; int192 quantizedValue; }
    //
    // Common doc errors to avoid (e.g. horizen.io tutorial as of 2025-08-05):
    //   - uint256 timestampNs  (wrong — must be uint64)
    //   - int128 quantizedValue (wrong — must be int192)
    //   - bytes signature      (wrong — r, s, v are separate bytes32/uint8 fields)
    solidityCallData: {
      function: "updateTemporalNumericValuesV1(StorkStructs.TemporalNumericValueInput[] calldata updateData) external payable",
      note: "Takes an array — wrap the single struct in []. Call getUpdateFeeV1(updateData) first to get the required msg.value.",
      structType: "StorkStructs.TemporalNumericValueInput",
      fieldOrder: ["temporalNumericValue", "id", "publisherMerkleRoot", "valueComputeAlgHash", "r", "s", "v"],
      fields: {
        temporalNumericValue: {
          structType: "StorkStructs.TemporalNumericValue",
          fields: {
            timestampNs: {
              value: sp.timestamped_signature.timestamp.toString(),
              solidityType: "uint64",
              source: "stork_signed_price.timestamped_signature.timestamp",
              criticalNote:
                "NANOSECONDS — pass as-is via BigInt(). Do not divide by 1e9. Off-by-1e9 causes the validity window check to fail silently.",
            },
            quantizedValue: {
              value: sp.price,
              solidityType: "int192",
              source: "stork_signed_price.price",
              criticalNote:
                "CRITICAL: type is int192, NOT uint256 or int256 or int128. Wrong type changes ABI encoding → changes the hash → Stork signature fails verification with no clear error message.",
            },
          },
        },
        id: {
          value: sp.encoded_asset_id,
          solidityType: "bytes32",
          source: "stork_signed_price.encoded_asset_id",
          note: "The feed ID — must be bytes32",
        },
        publisherMerkleRoot: {
          value: sp.publisher_merkle_root,
          solidityType: "bytes32",
          source: "stork_signed_price.publisher_merkle_root",
        },
        valueComputeAlgHash: {
          value: valueComputeAlgHash,
          solidityType: "bytes32",
          source: "stork_signed_price.calculation_alg.checksum",
        },
        r: {
          value: sig.r,
          solidityType: "bytes32",
          source: "stork_signed_price.timestamped_signature.signature.r",
          note: "Separate r field — NOT part of a concatenated bytes signature",
        },
        s: {
          value: sig.s,
          solidityType: "bytes32",
          source: "stork_signed_price.timestamped_signature.signature.s",
          note: "Separate s field",
        },
        v: {
          value: Number(sig.v),
          solidityType: "uint8",
          source: "stork_signed_price.timestamped_signature.signature.v",
          note: "API returns v as a string ('27' or '28'). Convert with Number() before ABI encoding.",
        },
      },
    },

    publisher: {
      publicKey: sp.public_key,
      merkleRoot: sp.publisher_merkle_root,
      algorithm: sp.calculation_alg,
    },

    source: "Stork REST API (live authenticated pull)",
    endpoint: url,
    refs: {
      storkRestApi: "https://docs.stork.network/api-reference/rest-api.md",
      storkStructs:
        "https://github.com/Stork-Oracle/stork-external/blob/main/chains/evm/sdks/stork_evm_sdk/StorkStructs.sol",
      horizenIntegration: "https://docs.horizen.io/horizen-chain/integrations/stork-oracle",
    },
  };
}

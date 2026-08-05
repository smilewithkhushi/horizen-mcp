import { z } from "zod";
import { createPublicClient, http } from "viem";
import { getRegistry, getContract } from "../registry.js";

// ABI for the zkVerify aggregation proxy.
// Source: https://docs.zkverify.io/architecture/proof-verification-smart-contract
//
// verifyProofAggregation: full on-chain Merkle proof check.
// proofsAggregations: public nested mapping — check if an aggregation has been posted.
//
// Note: the proxy address is the same on Horizen mainnet (26514) and several other chains
// (Arbitrum One, Base, OP Mainnet). Horizen testnet uses a different address.
const ZK_VERIFY_ABI = [
  {
    name: "verifyProofAggregation",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_domainId", type: "uint256" },
      { name: "_aggregationId", type: "uint256" },
      { name: "_leaf", type: "bytes32" },
      { name: "_merklePath", type: "bytes32[]" },
      { name: "_leafCount", type: "uint256" },
      { name: "_index", type: "uint256" },
    ],
    outputs: [{ name: "verified", type: "bool" }],
  },
  {
    name: "proofsAggregations",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_domainId", type: "uint256" },
      { name: "_aggregationId", type: "uint256" },
    ],
    outputs: [{ name: "merkleRoot", type: "bytes32" }],
  },
] as const;

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;

export const zkVerifyStatusInputSchema = z.object({
  domainId: z
    .string()
    .regex(/^\d+$/, "domainId must be a decimal integer (uint256)")
    .describe("zkVerify domain ID — identifies the aggregation domain. Obtained from the zkVerify SDK after proof submission."),
  aggregationId: z
    .string()
    .regex(/^\d+$/, "aggregationId must be a decimal integer (uint256)")
    .describe("zkVerify aggregation ID. Obtained from the zkVerify SDK after proof submission."),
  network: z
    .enum(["mainnet", "testnet"])
    .optional()
    .default("mainnet")
    .describe("Horizen network to check. Mainnet is the default. Testnet uses a different contract address."),
  // Full verification parameters (all four required together for full mode)
  leaf: z
    .string()
    .regex(bytes32Regex, "leaf must be 0x-prefixed 32-byte hex (64 hex chars)")
    .optional()
    .describe("Your proof's leaf hash in the aggregation Merkle tree. Obtained via aggregate_statementPath RPC on the zkVerify node."),
  merklePath: z
    .array(z.string().regex(bytes32Regex, "Each element must be 0x-prefixed 32-byte hex"))
    .optional()
    .describe("Merkle proof path from your leaf to the aggregation root. Obtained via aggregate_statementPath RPC."),
  leafCount: z
    .string()
    .regex(/^\d+$/, "leafCount must be a decimal integer")
    .optional()
    .describe("Total number of leaves in the aggregation Merkle tree."),
  index: z
    .string()
    .regex(/^\d+$/, "index must be a decimal integer")
    .optional()
    .describe("Index of your proof leaf within the aggregation Merkle tree."),
});

function getContractAddress(network: "mainnet" | "testnet"): string | null {
  const entry = getContract("zkverifyAggregationProxy");
  if (!entry) return null;
  return network === "mainnet" ? entry.mainnet : entry.testnet;
}

export async function handleCheckZkVerifyStatus(input: {
  domainId: string;
  aggregationId: string;
  network?: "mainnet" | "testnet";
  leaf?: string;
  merklePath?: string[];
  leafCount?: string;
  index?: string;
}) {
  const network = input.network ?? "mainnet";
  const registry = getRegistry();
  const netInfo = registry.networks[network];

  const contractAddress = getContractAddress(network);
  if (!contractAddress) {
    return {
      success: false,
      error: `zkVerify aggregation proxy address not confirmed for ${network} in registry. Check https://docs.zkverify.io/architecture/contract-addresses for the latest.`,
      network,
    };
  }

  const client = createPublicClient({
    transport: http(netInfo.rpcUrl),
  });

  const domainId = BigInt(input.domainId);
  const aggregationId = BigInt(input.aggregationId);

  const hasFullProof =
    input.leaf !== undefined &&
    input.merklePath !== undefined &&
    input.leafCount !== undefined &&
    input.index !== undefined;

  // Domain IDs for Horizen — confirmed from docs.zkverify.io/architecture/proof-aggregation/domain-management
  const knownDomainIds: Record<"mainnet" | "testnet", number> = { mainnet: 3, testnet: 175 };

  const base = {
    contractAddress,
    contractSource: "https://docs.zkverify.io/architecture/contract-addresses",
    network,
    chainId: netInfo.chainId,
    horizenDomainId: knownDomainIds[network],
    domainIdNote: `Use domainId=${knownDomainIds[network]} when targeting Horizen ${network}. This is the domain ID registered in zkVerify's aggregation system for this chain.`,
    rpcUrl: netInfo.rpcUrl,
    zkVerifyDocs: "https://docs.zkverify.io",
    howToGetProofParams:
      "Call aggregate_statementPath on a zkVerify node RPC to get leaf, merklePath, leafCount, and index for your proof.",
  };

  // Mode: full cryptographic verification
  // verifyProofAggregation(domainId, aggregationId, leaf, merklePath, leafCount, index) → bool
  // Returns true iff the aggregation exists AND the leaf is in the Merkle tree at the given index.
  if (hasFullProof) {
    let verified: boolean;
    try {
      verified = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: ZK_VERIFY_ABI,
        functionName: "verifyProofAggregation",
        args: [
          domainId,
          aggregationId,
          input.leaf as `0x${string}`,
          (input.merklePath ?? []) as `0x${string}`[],
          BigInt(input.leafCount!),
          BigInt(input.index!),
        ],
      });
    } catch (err) {
      return {
        success: false,
        mode: "full-verification",
        domainId: input.domainId,
        aggregationId: input.aggregationId,
        error: `verifyProofAggregation call failed: ${(err as Error).message}`,
        hint: "The aggregation may not have been posted yet, or domainId/aggregationId/leaf/index are incorrect.",
        ...base,
      };
    }

    return {
      success: true,
      mode: "full-verification",
      domainId: input.domainId,
      aggregationId: input.aggregationId,
      leaf: input.leaf,
      leafCount: input.leafCount,
      index: input.index,
      verified,
      status: verified ? "VERIFIED" : "NOT_VERIFIED",
      interpretation: verified
        ? "Proof is confirmed in the aggregation on-chain. The leaf is present in the Merkle tree at the given index."
        : "Proof NOT verified. Possible causes: aggregation not yet posted, wrong domainId, wrong aggregationId, wrong leaf hash, or wrong index.",
      ...base,
    };
  }

  // Mode: aggregation existence check
  // proofsAggregations(domainId, aggregationId) → bytes32 merkleRoot
  // Returns bytes32(0) if the aggregation has not been posted yet.
  let merkleRoot: `0x${string}`;
  try {
    merkleRoot = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: ZK_VERIFY_ABI,
      functionName: "proofsAggregations",
      args: [domainId, aggregationId],
    });
  } catch (err) {
    return {
      success: false,
      mode: "existence-check",
      domainId: input.domainId,
      aggregationId: input.aggregationId,
      error: `proofsAggregations read failed: ${(err as Error).message}`,
      hint: "Provide leaf, merklePath, leafCount, and index for full verification via verifyProofAggregation.",
      ...base,
    };
  }

  const exists = merkleRoot !== ZERO_BYTES32;

  return {
    success: true,
    mode: "existence-check",
    domainId: input.domainId,
    aggregationId: input.aggregationId,
    status: exists ? "AGGREGATION_POSTED" : "NOT_YET_POSTED",
    merkleRoot: exists ? merkleRoot : null,
    interpretation: exists
      ? "This aggregation has been posted to Horizen. Provide leaf, merklePath, leafCount, and index to verify your specific proof within it."
      : "Aggregation not yet posted to Horizen. zkVerify aggregation posting typically takes several minutes. Retry after waiting.",
    ...base,
  };
}

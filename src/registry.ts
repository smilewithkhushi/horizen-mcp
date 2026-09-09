import { createRequire } from "module";
import type { Registry, Network } from "./types.js";

const require = createRequire(import.meta.url);
const data = require("../data/chain-facts.json") as Registry;

export function getRegistry(): Registry {
  return data;
}

export function getNetwork(network: Network) {
  return data.networks[network];
}

export function getContract(key: string) {
  return data.contracts[key] ?? null;
}

export function getKnownContractKeys(): string[] {
  return Object.keys(data.contracts);
}

export function getFeed(assetId: string) {
  const entry = data.feeds[assetId];
  if (!entry || typeof entry === "string") return null;
  return entry;
}

export function getKnownFeedIds(): string[] {
  return Object.keys(data.feeds).filter((k) => k !== "_note");
}

export function getToken(key: string) {
  return data.tokens[key] ?? null;
}

export function getKnownTokenKeys(): string[] {
  return Object.keys(data.tokens);
}

export function getBridge(key: string) {
  return data.bridges[key] ?? null;
}

export function getIntegration(key: string) {
  return data.integrations[key] ?? null;
}

export function getKnownIntegrationKeys(): string[] {
  return Object.keys(data.integrations);
}

export { data as registry };

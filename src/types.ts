export type Network = "mainnet" | "testnet";

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  rpcUrlWs: string;
  explorerUrl: string;
  hubUrl: string;
  currencySymbol: string;
  gasToken: string;
  settlementLayer: string;
  stack: string;
  faucetUrl?: string;
  source: string;
  verified: string;
}

export interface ContractEntry {
  displayName: string;
  mainnet: string | null;
  testnet: string | null;
  notes: string;
  source: string;
  verified: string;
}

export interface FeedEntry {
  id: string;
  derivation: string;
  source: string;
  verified: string;
}

export interface BridgeEntry {
  displayName: string;
  mainnetUrl?: string;
  testnetUrl?: string;
  zenDeepLink?: string;
  supportedAssets: string[] | null;
  notes: string;
}

export interface IntegrationEntry {
  displayName: string;
  category: string;
  type?: string;
  status: string;
  networks: string[];
  accessMethod: string;
  referencePath: string;
  tutorialPath: string;
  externalDocs?: string;
  sdkVersion?: string;
  dashboard?: string;
  builtOn?: string;
  programmaticAlternative?: string;
  notes: string;
}

export interface TokenNetworkAddresses {
  horizen: string;
  horizenNote?: string;
  horizenOft?: string;
  horizenOftNote?: string;
  base?: string;
  baseNote?: string;
  baseOftAdapter?: string;
  baseSepolia?: string;
  baseSepoliaOftAdapter?: string;
  baseStargatePool?: string;
}

export interface TokenEntry {
  displayName: string;
  symbol: string;
  decimals: number;
  decimalsWarning?: string;
  role: string;
  bridge: string;
  mainnet: TokenNetworkAddresses;
  testnet: TokenNetworkAddresses | null;
  testnetNote?: string;
  upgradeNote?: string;
  source: string;
  verified: string;
}

export interface Registry {
  schemaVersion: string;
  lastVerified: string;
  networks: Record<Network, NetworkInfo>;
  contracts: Record<string, ContractEntry>;
  tokens: Record<string, TokenEntry>;
  feeds: Record<string, FeedEntry | string>;
  bridges: Record<string, BridgeEntry>;
  layerZeroEids: Record<string, number>;
  integrations: Record<string, IntegrationEntry>;
}

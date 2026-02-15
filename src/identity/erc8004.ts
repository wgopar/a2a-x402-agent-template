import { SDK } from "agent0-sdk";
import type { Config } from "../config.js";

export interface RegistrationResult {
  agentId: string;
  txHash: string;
  agentURI?: string;
}

export type RegistryAddresses = Record<string, string>;

// ERC-8004 registry addresses not built into agent0-sdk
const REGISTRY_ADDRESSES: Record<number, RegistryAddresses> = {
  84532: { IDENTITY: "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb" }, // Base Sepolia
  8453: { IDENTITY: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }, // Base Mainnet
};

export async function registerAgent(
  config: Config,
  opts?: { registryAddresses?: RegistryAddresses },
): Promise<RegistrationResult> {
  const chainId = parseInt(config.network.split(":")[1], 10);

  const builtinAddresses = REGISTRY_ADDRESSES[chainId];
  const registryOverrides = opts?.registryAddresses
    ? { [chainId]: opts.registryAddresses }
    : builtinAddresses
      ? { [chainId]: builtinAddresses }
      : undefined;

  const sdkConfig = {
    chainId,
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey,
    ...(registryOverrides && { registryOverrides }),
    ...(config.pinataJwt && { ipfs: "pinata" as const, pinataJwt: config.pinataJwt }),
  };

  const sdk = new SDK(sdkConfig);
  const agent = sdk.createAgent(config.agentName, config.agentDescription);

  // Register A2A endpoint
  await agent.setA2A(config.agentUrl);

  // Flag x402 payment support
  agent.setX402Support(true);

  // Publish to IPFS and register on-chain (step 1: mint token)
  const txHandle = await agent.registerIPFS();

  // Wait for mint confirmation, upload metadata to IPFS, set on-chain URI (step 2)
  const { result } = await txHandle.waitMined();

  return {
    agentId: agent.agentId ?? "pending",
    txHash: txHandle.hash,
    agentURI: result?.agentURI,
  };
}

import { SDK } from "agent0-sdk";
import type { Config } from "../config.js";

export interface RegistrationResult {
  agentId: string;
  txHash: string;
}

export type RegistryAddresses = Record<string, string>;

export async function registerAgent(
  config: Config,
  opts?: { registryAddresses?: RegistryAddresses },
): Promise<RegistrationResult> {
  const chainId = parseInt(config.network.split(":")[1], 10);

  const registryOverrides = opts?.registryAddresses
    ? { [chainId]: opts.registryAddresses }
    : undefined;

  const sdkConfig = {
    chainId,
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey,
    ...(registryOverrides && { registryOverrides }),
  };

  const sdk = new SDK(sdkConfig);
  const agent = sdk.createAgent(config.agentName, config.agentDescription);

  // Register A2A endpoint
  await agent.setA2A(config.agentUrl);

  // Flag x402 payment support
  agent.setX402Support(true);

  // Publish to IPFS and register on-chain
  const txHandle = await agent.registerIPFS();

  return {
    agentId: agent.agentId ?? "pending",
    txHash: txHandle.hash,
  };
}

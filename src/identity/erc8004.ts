import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { SDK } from "agent0-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { IdentityClient, ViemAdapter } from "erc-8004-js";
import type { Config } from "../config.js";
import { skills } from "../agent/skills.js";

export interface RegistrationResult {
  agentId: string;
  txHash: string;
  agentURI?: string;
  imageCID?: string;
}

export type RegistryAddresses = Record<string, string>;

// ERC-8004 registry addresses not built into agent0-sdk
const REGISTRY_ADDRESSES: Record<number, RegistryAddresses> = {
  84532: { IDENTITY: "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb" }, // Base Sepolia
  8453: { IDENTITY: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }, // Base Mainnet
};

// Minimal ERC-721 Enumerable ABI for owner lookups
const ERC721_ENUMERABLE_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function parseChainId(network: string): number {
  return parseInt(network.split(":")[1], 10);
}

function getRegistryAddress(chainId: number): string {
  const addr = REGISTRY_ADDRESSES[chainId]?.IDENTITY;
  if (!addr) throw new Error(`No registry address for chain ${chainId}`);
  return addr;
}

function buildSDK(config: Config, chainId: number) {
  const builtinAddresses = REGISTRY_ADDRESSES[chainId];
  const registryOverrides = builtinAddresses
    ? { [chainId]: builtinAddresses }
    : undefined;

  return new SDK({
    chainId,
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey,
    ...(registryOverrides && { registryOverrides }),
    ...(config.pinataJwt && { ipfs: "pinata" as const, pinataJwt: config.pinataJwt }),
  });
}

function applyAgentMetadata(
  agent: ReturnType<SDK["createAgent"]>,
  config: Config,
) {
  agent.setA2A(config.agentUrl);
  agent.setX402Support(true);
  for (const skill of skills) {
    agent.addSkill(skill.id);
  }
}

async function uploadImageToPinata(
  imagePath: string,
  pinataJwt: string,
): Promise<string> {
  const imageData = readFileSync(imagePath);
  const blob = new Blob([imageData], { type: "image/png" });
  const formData = new FormData();
  formData.append("file", blob, basename(imagePath));
  formData.append("network", "public");

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload image to Pinata: HTTP ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const cid = result?.data?.cid || result?.cid || result?.IpfsHash;
  if (!cid) {
    throw new Error(`No CID returned from Pinata. Response: ${JSON.stringify(result)}`);
  }
  return cid;
}

/**
 * Find an existing agent owned by the wallet address.
 * Uses ERC-721 Enumerable to look up tokens owned by the address.
 */
export async function findAgentByOwner(
  config: Config,
): Promise<number | null> {
  const chainId = parseChainId(config.network);
  const registryAddress = getRegistryAddress(chainId);

  const client = createPublicClient({ transport: http(config.rpcUrl) });

  try {
    const balance = await client.readContract({
      address: registryAddress as `0x${string}`,
      abi: ERC721_ENUMERABLE_ABI,
      functionName: "balanceOf",
      args: [config.walletAddress as `0x${string}`],
    });

    if (balance === 0n) return null;

    // Return the most recently minted token (last index)
    const tokenId = await client.readContract({
      address: registryAddress as `0x${string}`,
      abi: ERC721_ENUMERABLE_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [config.walletAddress as `0x${string}`, balance - 1n],
    });

    return Number(tokenId);
  } catch {
    return null;
  }
}

async function uploadJsonToPinata(
  json: unknown,
  pinataJwt: string,
  name: string,
): Promise<string> {
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  const formData = new FormData();
  formData.append("file", blob, `${name}.json`);
  formData.append("network", "public");

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload JSON to Pinata: HTTP ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const cid = result?.data?.cid || result?.cid || result?.IpfsHash;
  if (!cid) {
    throw new Error(`No CID returned from Pinata. Response: ${JSON.stringify(result)}`);
  }
  return cid;
}

/**
 * Update an existing agent's metadata on IPFS and on-chain.
 * Uses agent0-sdk to build metadata, Pinata for IPFS upload,
 * and erc-8004-js IdentityClient to call setAgentURI on-chain.
 */
export async function updateAgent(
  config: Config,
  agentId: number,
  opts?: { imagePath?: string },
): Promise<RegistrationResult> {
  if (!config.pinataJwt) {
    throw new Error("PINATA_JWT is required for agent metadata updates");
  }

  const chainId = parseChainId(config.network);

  // Build metadata using agent0-sdk
  const sdk = buildSDK(config, chainId);
  const agent = sdk.createAgent(config.agentName, config.agentDescription);
  applyAgentMetadata(agent, config);

  let imageCID: string | undefined;
  if (opts?.imagePath && config.pinataJwt) {
    imageCID = await uploadImageToPinata(opts.imagePath, config.pinataJwt);
    agent.updateInfo(undefined, undefined, `ipfs://${imageCID}`);
  }

  // Get the registration file JSON and upload to IPFS
  const registrationFile = agent.getRegistrationFile();
  const metadataCID = await uploadJsonToPinata(registrationFile, config.pinataJwt, `agent-${agentId}`);
  const agentURI = `ipfs://${metadataCID}`;

  // Update on-chain URI via erc-8004-js
  const registryAddress = getRegistryAddress(chainId);
  const account = privateKeyToAccount(config.privateKey as `0x${string}`);
  const publicClient = createPublicClient({ transport: http(config.rpcUrl) });
  const walletClient = createWalletClient({
    account,
    transport: http(config.rpcUrl),
  });
  const adapter = new ViemAdapter(publicClient, walletClient, account);
  const identityClient = new IdentityClient(adapter, registryAddress);

  const { txHash } = await identityClient.setAgentURI(BigInt(agentId), agentURI);

  return {
    agentId: String(agentId),
    txHash,
    agentURI,
    imageCID,
  };
}

export async function registerAgent(
  config: Config,
  opts?: { registryAddresses?: RegistryAddresses; imagePath?: string },
): Promise<RegistrationResult> {
  const chainId = parseChainId(config.network);

  const registryOverrides = opts?.registryAddresses
    ? { [chainId]: opts.registryAddresses }
    : REGISTRY_ADDRESSES[chainId]
      ? { [chainId]: REGISTRY_ADDRESSES[chainId] }
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

  applyAgentMetadata(agent, config);

  // Upload image to IPFS and set on agent metadata (before registerIPFS serializes it)
  let imageCID: string | undefined;
  if (opts?.imagePath && config.pinataJwt) {
    imageCID = await uploadImageToPinata(opts.imagePath, config.pinataJwt);
    agent.updateInfo(undefined, undefined, `ipfs://${imageCID}`);
  }

  // Publish to IPFS and register on-chain (step 1: mint token)
  const txHandle = await agent.registerIPFS();

  // Wait for mint confirmation, upload metadata to IPFS, set on-chain URI (step 2)
  const { result } = await txHandle.waitMined();

  return {
    agentId: agent.agentId ?? "pending",
    txHash: txHandle.hash,
    agentURI: result?.agentURI,
    imageCID,
  };
}

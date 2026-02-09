import "dotenv/config";

export interface Config {
  walletAddress: string;
  privateKey: string;
  network: string;
  rpcUrl: string;
  facilitatorUrl: string;
  agentName: string;
  agentDescription: string;
  agentUrl: string;
  port: number;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    walletAddress: required("WALLET_ADDRESS"),
    privateKey: required("PRIVATE_KEY"),
    network: process.env.NETWORK ?? "eip155:84532",
    rpcUrl: process.env.RPC_URL ?? "https://sepolia.base.org",
    facilitatorUrl: process.env.FACILITATOR_URL ?? "https://x402.org/facilitator",
    agentName: process.env.AGENT_NAME ?? "Hello Agent",
    agentDescription: process.env.AGENT_DESCRIPTION ?? "A simple Hello World agent",
    agentUrl: process.env.AGENT_URL ?? "http://localhost:3000",
    port: parseInt(process.env.PORT ?? "3000", 10),
  };
}

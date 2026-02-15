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
  pinataJwt?: string;
  agentProviderName?: string;
  agentProviderUrl?: string;
  agentDocsUrl?: string;
  agentIconUrl?: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function resolvePrivateKey(): Promise<string> {
  const secretArn = process.env.PRIVATE_KEY_SECRET_ARN;
  if (secretArn) {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );
    const client = new SecretsManagerClient({});
    const resp = await client.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    if (!resp.SecretString) throw new Error(`Secret ${secretArn} is empty`);
    return resp.SecretString;
  }
  return required("PRIVATE_KEY");
}

export async function loadConfig(): Promise<Config> {
  return {
    walletAddress: required("WALLET_ADDRESS"),
    privateKey: await resolvePrivateKey(),
    network: process.env.NETWORK ?? "eip155:84532",
    rpcUrl: process.env.RPC_URL ?? "https://sepolia.base.org",
    facilitatorUrl: process.env.FACILITATOR_URL ?? "https://www.x402.org/facilitator",
    agentName: process.env.AGENT_NAME ?? "Hello Agent",
    agentDescription: process.env.AGENT_DESCRIPTION ?? "A simple Hello World agent",
    agentUrl: process.env.AGENT_URL ?? "http://localhost:3000",
    port: parseInt(process.env.PORT ?? "3000", 10),
    pinataJwt: process.env.PINATA_JWT,
    agentProviderName: process.env.AGENT_PROVIDER_NAME,
    agentProviderUrl: process.env.AGENT_PROVIDER_URL,
    agentDocsUrl: process.env.AGENT_DOCS_URL,
    agentIconUrl: process.env.AGENT_ICON_URL,
  };
}

import "dotenv/config";

export interface Config {
  walletAddress: string;
  privateKey: string;
  network: string;
  rpcUrl: string;
  agentName: string;
  agentDescription: string;
  agentUrl: string;
  port: number;
  pinataJwt?: string;
  agentProviderName?: string;
  agentProviderUrl?: string;
  agentDocsUrl?: string;
  agentIconUrl?: string;
  agentId?: number;
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
  bypassPayments: boolean;
  meterMaxPricePerRequest: string;
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
  const bypassPayments = process.env.BYPASS_PAYMENTS === "true";
  if (bypassPayments && process.env.NODE_ENV === "production") {
    throw new Error("BYPASS_PAYMENTS=true is not allowed in production");
  }

  const agentIdRaw = process.env.AGENT_ID;

  return {
    walletAddress: required("WALLET_ADDRESS"),
    privateKey: await resolvePrivateKey(),
    network: process.env.NETWORK ?? "eip155:84532",
    rpcUrl: process.env.RPC_URL ?? "https://sepolia.base.org",
    agentName: process.env.AGENT_NAME ?? "Hello Agent",
    agentDescription: process.env.AGENT_DESCRIPTION ?? "A simple Hello World agent",
    agentUrl: process.env.AGENT_URL ?? "http://localhost:3000",
    port: parseInt(process.env.PORT ?? "3000", 10),
    pinataJwt: process.env.PINATA_JWT,
    agentProviderName: process.env.AGENT_PROVIDER_NAME,
    agentProviderUrl: process.env.AGENT_PROVIDER_URL,
    agentDocsUrl: process.env.AGENT_DOCS_URL,
    agentIconUrl: process.env.AGENT_ICON_URL,
    agentId: agentIdRaw ? parseInt(agentIdRaw, 10) : undefined,
    cdpApiKeyId: process.env.CDP_API_KEY_ID,
    cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
    bypassPayments,
    meterMaxPricePerRequest: process.env.METER_MAX_PRICE_PER_REQUEST ?? "$0.50",
  };
}

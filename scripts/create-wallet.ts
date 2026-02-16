import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const agentName = process.argv[2] || "a2a-agent";
const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readWithFallback(primary: string, fallback: string): string {
  const target = existsSync(primary) ? primary : fallback;
  return readFileSync(target, "utf-8");
}

const tfvarsPath = resolve(projectDir, "infra/terraform.tfvars");
const tfvars = readWithFallback(tfvarsPath, resolve(projectDir, "infra/terraform.tfvars.example"))
  .replace(/^function_name\s*=\s*"[^"]*".*/m, `function_name  = "${agentName}"`)
  .replace(/^wallet_address\s*=\s*"[^"]*".*/m, `wallet_address = "${account.address}"`)
  .replace(/^private_key\s*=\s*"[^"]*".*/m, `private_key    = "${privateKey}"`);
writeFileSync(tfvarsPath, tfvars);

const envPath = resolve(projectDir, ".env");
const env = readWithFallback(envPath, resolve(projectDir, ".env.example"))
  .replace(/^WALLET_ADDRESS=.*/m, `WALLET_ADDRESS=${account.address}`)
  .replace(/^PRIVATE_KEY=.*/m, `PRIVATE_KEY=${privateKey}`);
writeFileSync(envPath, env);

console.log(`
  Wallet created for: ${agentName}
  Address: ${account.address}

  Written to:
  - infra/terraform.tfvars (Lambda deploy)
  - .env (local dev)

  Next steps:
  1. Save address + private key from terraform.tfvars to 1Password
  2. Fund the address with testnet ETH (Base Sepolia faucet)
  3. npm run deploy
`);

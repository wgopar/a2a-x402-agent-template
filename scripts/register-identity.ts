import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { registerAgent } from "../src/identity/erc8004.js";

async function main() {
  const config = loadConfig();

  console.log(`Registering agent "${config.agentName}" on ${config.network}...`);
  console.log(`  A2A endpoint: ${config.agentUrl}`);
  console.log(`  Wallet: ${config.walletAddress}`);

  const result = await registerAgent(config);

  console.log("\nRegistration complete!");
  console.log(`  Agent ID: ${result.agentId}`);
  console.log(`  TX Hash:  ${result.txHash}`);
}

main().catch((err) => {
  console.error("Registration failed:", err);
  process.exit(1);
});

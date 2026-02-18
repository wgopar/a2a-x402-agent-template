import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { registerAgent } from "../src/identity/erc8004.js";

const DEFAULT_ICON = resolve(import.meta.dirname, "..", "assets", "icon.png");

async function main() {
  const config = await loadConfig();
  const explicit = process.env.AGENT_IMAGE_PATH;
  const imagePath = explicit ?? (existsSync(DEFAULT_ICON) ? DEFAULT_ICON : undefined);

  console.log(`Registering agent "${config.agentName}" on ${config.network}...`);
  console.log(`  A2A endpoint: ${config.agentUrl}`);
  console.log(`  Wallet: ${config.walletAddress}`);
  if (imagePath) {
    console.log(`  Image: ${imagePath}`);
  }

  const result = await registerAgent(config, { imagePath });

  console.log("\nRegistration complete!");
  console.log(`  Agent ID:  ${result.agentId}`);
  console.log(`  TX Hash:   ${result.txHash}`);
  if (result.agentURI) {
    console.log(`  Agent URI: ${result.agentURI}`);
  }
  if (result.imageCID) {
    console.log(`  Image CID: ${result.imageCID}`);
    console.log(`  Image URL: https://gateway.pinata.cloud/ipfs/${result.imageCID}`);
  }
}

main().catch((err) => {
  console.error("Registration failed:", err);
  process.exit(1);
});

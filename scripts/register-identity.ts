import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { registerAgent, updateAgent, findAgentByOwner } from "../src/identity/erc8004.js";

const DEFAULT_ICON = resolve(import.meta.dirname, "..", "assets", "icon.png");

async function main() {
  const config = await loadConfig();
  const explicit = process.env.AGENT_IMAGE_PATH;
  const imagePath = explicit ?? (existsSync(DEFAULT_ICON) ? DEFAULT_ICON : undefined);

  console.log(`Agent "${config.agentName}" on ${config.network}`);
  console.log(`  A2A endpoint: ${config.agentUrl}`);
  console.log(`  Wallet: ${config.walletAddress}`);
  if (imagePath) {
    console.log(`  Image: ${imagePath}`);
  }

  // Check for existing agent: explicit AGENT_ID > auto-detect by owner
  let existingId = config.agentId ?? null;
  if (!existingId) {
    console.log("\nSearching for existing agent...");
    existingId = await findAgentByOwner(config);
    if (existingId) {
      console.log(`  Found existing agent: ${existingId}`);
    }
  }

  let result;
  if (existingId) {
    console.log(`\nUpdating agent ${existingId}...`);
    result = await updateAgent(config, existingId, { imagePath });
  } else {
    console.log("\nRegistering new agent...");
    result = await registerAgent(config, { imagePath });
  }

  console.log("\nDone!");
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

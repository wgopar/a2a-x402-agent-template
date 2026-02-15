import type { AgentCard, AgentSkill } from "@a2a-js/sdk";
import type { Config } from "../config.js";

export function buildAgentCard(config: Config, skills: AgentSkill[]): AgentCard {
  const card: AgentCard = {
    name: config.agentName,
    description: config.agentDescription,
    url: `${config.agentUrl}/a2a`,
    version: "0.1.0",
    protocolVersion: "0.3.0",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extensions: [
        {
          uri: "https://github.com/google-a2a/a2a-x402/v0.1",
          description: "Supports payments using the x402 protocol for on-chain settlement.",
          required: true,
        },
      ],
    },
    skills,
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
  };

  if (config.agentProviderName && config.agentProviderUrl) {
    card.provider = {
      organization: config.agentProviderName,
      url: config.agentProviderUrl,
    };
  }
  if (config.agentDocsUrl) card.documentationUrl = config.agentDocsUrl;
  if (config.agentIconUrl) card.iconUrl = config.agentIconUrl;

  return card;
}

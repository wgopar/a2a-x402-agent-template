import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import type { Config } from "../config.js";

export interface RoutePrice {
  path: string;
  price: string;
  description: string;
}

export function createPaymentMiddleware(config: Config, routes: RoutePrice[]) {
  if (!config.cdpApiKeyId || !config.cdpApiKeySecret) {
    throw new Error(
      "CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for payment middleware",
    );
  }

  const network = config.network as Network;
  const canonicalBase = config.agentUrl.replace(/\/$/, "");

  const facilitatorConfig = createFacilitatorConfig(
    config.cdpApiKeyId,
    config.cdpApiKeySecret,
  );
  const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    network,
    new ExactEvmScheme(),
  );

  const routeConfig: Record<
    string,
    {
      accepts: { scheme: string; price: string; network: Network; payTo: string };
      description: string;
      mimeType: string;
      resource: string;
    }
  > = {};

  for (const route of routes) {
    const routePath = route.path.split(" ")[1]?.replace(/^\//, "") ?? "";
    routeConfig[route.path] = {
      accepts: {
        scheme: "exact",
        price: route.price,
        network,
        payTo: config.walletAddress,
      },
      description: route.description,
      mimeType: "application/json",
      resource: `${canonicalBase}/${routePath}`,
    };
  }

  return paymentMiddleware(routeConfig, resourceServer);
}

import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { Config } from "../config.js";

export interface RoutePrice {
  path: string;
  price: string;
  description: string;
}

export function createPaymentMiddleware(config: Config, routes: RoutePrice[]) {
  const network = config.network as Network;

  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

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
    }
  > = {};

  for (const route of routes) {
    routeConfig[route.path] = {
      accepts: {
        scheme: "exact",
        price: route.price,
        network,
        payTo: config.walletAddress,
      },
      description: route.description,
      mimeType: "application/json",
    };
  }

  return paymentMiddleware(routeConfig, resourceServer);
}

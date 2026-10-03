import { RoutingError, type WalkingRouter } from "./types";

/**
 * Tries each router in order and moves on only on RoutingError (service down, bad response); programming errors
 * still surface. The provider id of the router that answered is reported through `lastProvider`.
 */
export function withFallback(routers: WalkingRouter[]): WalkingRouter & { lastProvider: () => string } {
  let provider = routers[0]?.id ?? "none";
  const attempt = async <T>(call: (router: WalkingRouter) => Promise<T>): Promise<T> => {
    let lastError: RoutingError = new RoutingError("Brak serwisu tras.");
    for (const router of routers) {
      try {
        const result = await call(router);
        provider = router.id;
        return result;
      } catch (error) {
        if (!(error instanceof RoutingError)) throw error;
        lastError = error;
      }
    }
    throw lastError;
  };
  return {
    get id() {
      return provider;
    },
    lastProvider: () => provider,
    matrix: (origin, targets) => attempt((router) => router.matrix(origin, targets)),
    route: (origin, target) => attempt((router) => router.route(origin, target)),
  };
}

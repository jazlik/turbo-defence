import { RoutingError, type WalkingRouter } from "./types";

/**
 * Tries each router in order and moves on only on RoutingError (service down, bad response); programming errors
 * still surface. The provider id of the router that answered is reported through `lastProvider`.
 *
 * Sticky: once a router answers after another failed, later calls start with it. One refresh is a matrix plus two
 * routes; paying the dead service's timeout on every call pushed an emergency search past its time limit.
 */
export function withFallback(routers: WalkingRouter[]): WalkingRouter & { lastProvider: () => string } {
  let provider = routers[0]?.id ?? "none";
  let order = [...routers];
  const attempt = async <T>(call: (router: WalkingRouter) => Promise<T>): Promise<T> => {
    let lastError: RoutingError = new RoutingError("Brak serwisu tras.");
    for (const router of order) {
      try {
        const result = await call(router);
        provider = router.id;
        if (order[0] !== router) order = [router, ...order.filter((candidate) => candidate !== router)];
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

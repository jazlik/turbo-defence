import { withFallback } from "./fallback";
import { osrmRouter } from "./osrm";
import { valhallaRouter } from "./valhalla";

/** OSRM first; Valhalla (also FOSSGIS) when OSRM is down — guidance never depends on either (SavedRoute only). */
export const walkingRouter = withFallback([osrmRouter, valhallaRouter]);

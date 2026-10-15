import {Route} from "../../types";
import {getSystemTelemetryHandler} from "./controller";

const routes: Route[] = [
  {
    method: "get",
    path: "/v1/system/telemetry",
    handler: getSystemTelemetryHandler,
  },
];

export default routes;

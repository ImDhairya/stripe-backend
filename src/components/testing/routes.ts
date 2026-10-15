import {Route} from "../../types";
import {injectFailureHandler, seedDemoHandler} from "./controller";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/testing/fail-webhook",
    isPublic: true,
    handler: injectFailureHandler,
  },
  {
    method: "post",
    path: "/v1/testing/seed-demo",
    isPublic: true,
    handler: seedDemoHandler,
  },
];

export default routes;

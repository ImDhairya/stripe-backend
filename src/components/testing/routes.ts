import {Route} from "../../types";
import {injectFailureHandler} from "./controller";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/testing/fail-webhook",
    isPublic: true, // Making public so it's easy to test
    handler: injectFailureHandler,
  }
];

export default routes;

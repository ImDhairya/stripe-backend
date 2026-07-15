import {Route} from "../../types";
import {handleStripeWebhook} from "./controller";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/stripe/data",
    isPublic: true,
    handler: handleStripeWebhook,
  }
];

export default routes;

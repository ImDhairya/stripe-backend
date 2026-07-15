import {Route} from "../../types";
import {searchHandler} from "./controller";
import {searchSchema} from "./schema";

const routes: Route[] = [
  {
    method: "get",
    path: "/v1/search/:resource",
    querySchema: searchSchema,
    handler: searchHandler,
  }
];

export default routes;

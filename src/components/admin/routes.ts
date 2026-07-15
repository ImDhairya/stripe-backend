import {Route} from "../../types";
import {requireRole} from "../../middlewares/authorize";
import {upgradeUserHandler} from "./controller";
import {upgradeUserSchema} from "./schema";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/admin/upgrade-user",
    schema: upgradeUserSchema,
    middlewares: [requireRole("admin")],
    handler: upgradeUserHandler,
  },
];

export default routes;

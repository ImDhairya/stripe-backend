import {RequestHandler} from "express";
import {asyncHandler} from "../../lib/async-handler";
import {searchSchema, SearchSchema} from "./schema";
import {searchResource} from "./services/search-resource";

export const searchHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {resource} = req.params as {resource: string};
    
    const allowedResources = ["payments", "refunds", "audit-logs", "users"];
    if (!allowedResources.includes(resource)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "resource:not_found",
          message: `Resource ${resource} not found`,
        }
      });
    }

    // Users search is admin-only
    if (resource === "users" && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          code: "auth:forbidden",
          message: "You do not have permission to search users",
        }
      });
    }

    const query = (req as any).parsedQuery || searchSchema.parse(req.query);
    const result = await searchResource(resource, user.id, user.role, query);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  }
);

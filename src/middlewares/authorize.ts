import {RequestHandler} from "express";

export const requireRole = (...roles: Array<"user" | "admin">): RequestHandler => {
  return (req, res, next) => {
    const user = res.locals.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        error: {
          message: "Forbidden: insufficient role",
          status: 403,
        }
      });
    }
    next();
  };
};

export const requireTier = (...tiers: Array<"free" | "paid">): RequestHandler => {
  return (req, res, next) => {
    const user = res.locals.user;
    if (!user || !tiers.includes(user.tier)) {
      return res.status(403).json({
        error: {
          message: "Forbidden: insufficient tier",
          status: 403,
        }
      });
    }
    next();
  };
};

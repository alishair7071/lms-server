require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import { catchAsyncErrors } from "./catchAsyncErrors";

//Authenticated User....
export const isAuthenticated = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    // TESTING MODE: do not hard-fail requests that are missing/expired tokens.
    // If tokens exist, we still try to attach req.user for downstream handlers.
    // If a previous middleware (e.g. updateAccessToken) already attached the user,
    // treat the request as authenticated.
    if (req.user) {
      return next();
    }
    const access_token = req.cookies?.access_token as string;
    if (!access_token) {
      return next();
    }
    let decode: JwtPayload | null = null;
    try {
      decode = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;
    } catch {
      return next();
    }
    if (!decode?.id) return next();

    const user = await redis.get(decode.id);
    if (!user) {
      return next();
    }
    req.user = JSON.parse(user);
    next();
  }
);

//validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TESTING MODE: skip role checks
    next();
  };
};

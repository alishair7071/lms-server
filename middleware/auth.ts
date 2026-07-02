require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import { catchAsyncErrors } from "./catchAsyncErrors";

//Authenticated User....
export const isAuthenticated = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    // A previous middleware (e.g. updateAccessToken) may have already resolved the
    // user from a valid refresh token — treat that as authenticated.
    if (req.user) {
      return next();
    }
    const access_token = req.cookies?.access_token as string;
    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 401)
      );
    }
    let decode: JwtPayload | null = null;
    try {
      decode = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;
    } catch {
      return next(
        new ErrorHandler("Your session has expired, please login again", 401)
      );
    }
    if (!decode?.id) {
      return next(
        new ErrorHandler("Invalid token, please login again", 401)
      );
    }

    const user = await redis.get(decode.id);
    if (!user) {
      return next(
        new ErrorHandler("Please login to access this resource", 401)
      );
    }
    req.user = JSON.parse(user);
    next();
  }
);

//validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role || "";
    if (!roles.includes(role)) {
      return next(
        new ErrorHandler(
          `Role: ${role || "guest"} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};

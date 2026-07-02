require("dotenv").config();
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}


  // In production the client (Vercel) and API run on different domains, so cookies
  // are sent cross-site. Browsers only include cross-site cookies when they are
  // SameSite=None AND Secure. In development we keep SameSite=Lax over http.
  const isProduction = process.env.NODE_ENV === "production";

  //option for cookies
 export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };


  export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  //upload session to redis
  redis.set(String(user._id), JSON.stringify(user) as any);



  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    accessToken,
    user,
  });
};

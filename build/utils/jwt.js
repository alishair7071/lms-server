"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.refreshTokenOptions = exports.accessTokenOptions = void 0;
require("dotenv").config();
const redis_1 = require("./redis");
// In production the client (Vercel) and API run on different domains, so cookies
// are sent cross-site. Browsers only include cross-site cookies when they are
// SameSite=None AND Secure. In development we keep SameSite=Lax over http.
const isProduction = process.env.NODE_ENV === "production";
//option for cookies
exports.accessTokenOptions = {
    expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
};
const sendToken = (user, statusCode, res) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    //upload session to redis
    redis_1.redis.set(String(user._id), JSON.stringify(user));
    res.cookie("access_token", accessToken, exports.accessTokenOptions);
    res.cookie("refresh_token", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        accessToken,
        user,
    });
};
exports.sendToken = sendToken;

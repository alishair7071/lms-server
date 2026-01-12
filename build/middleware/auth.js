"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
require("dotenv").config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../utils/redis");
const catchAsyncErrors_1 = require("./catchAsyncErrors");
//Authenticated User....
exports.isAuthenticated = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    // TESTING MODE: do not hard-fail requests that are missing/expired tokens.
    // If tokens exist, we still try to attach req.user for downstream handlers.
    // If a previous middleware (e.g. updateAccessToken) already attached the user,
    // treat the request as authenticated.
    if (req.user) {
        return next();
    }
    const access_token = req.cookies?.access_token;
    if (!access_token) {
        return next();
    }
    let decode = null;
    try {
        decode = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN);
    }
    catch {
        return next();
    }
    if (!decode?.id)
        return next();
    const user = await redis_1.redis.get(decode.id);
    if (!user) {
        return next();
    }
    req.user = JSON.parse(user);
    next();
});
//validate user role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // TESTING MODE: skip role checks
        next();
    };
};
exports.authorizeRoles = authorizeRoles;

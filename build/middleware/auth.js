"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
require("dotenv").config();
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../utils/redis");
const catchAsyncErrors_1 = require("./catchAsyncErrors");
//Authenticated User....
exports.isAuthenticated = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    // A previous middleware (e.g. updateAccessToken) may have already resolved the
    // user from a valid refresh token — treat that as authenticated.
    if (req.user) {
        return next();
    }
    const access_token = req.cookies?.access_token;
    if (!access_token) {
        return next(new ErrorHandler_1.default("Please login to access this resource", 401));
    }
    let decode = null;
    try {
        decode = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN);
    }
    catch {
        return next(new ErrorHandler_1.default("Your session has expired, please login again", 401));
    }
    if (!decode?.id) {
        return next(new ErrorHandler_1.default("Invalid token, please login again", 401));
    }
    const user = await redis_1.redis.get(decode.id);
    if (!user) {
        return next(new ErrorHandler_1.default("Please login to access this resource", 401));
    }
    req.user = JSON.parse(user);
    next();
});
//validate user role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const role = req.user?.role || "";
        if (!roles.includes(role)) {
            return next(new ErrorHandler_1.default(`Role: ${role || "guest"} is not allowed to access this resource`, 403));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;

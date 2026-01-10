"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const mongoose_1 = __importDefault(require("mongoose"));
const dbUrl = process.env.DB_URL || '';
const connectDB = async () => {
    if (!dbUrl) {
        throw new Error("DB_URL is not set");
    }
    try {
        // Cache the connection in serverless environments (e.g. Vercel) to avoid reconnecting on every request.
        if (global.__mongooseConn)
            return global.__mongooseConn;
        if (!global.__mongoosePromise) {
            global.__mongoosePromise = mongoose_1.default.connect(dbUrl);
        }
        global.__mongooseConn = await global.__mongoosePromise;
        console.log(`MongoDB connected with server: ${global.__mongooseConn.connection.host}`);
        return global.__mongooseConn;
    }
    catch (error) {
        console.log(`MongoDB connection error: ${error?.message ?? error}`);
        global.__mongoosePromise = null;
        global.__mongooseConn = null;
        throw error;
    }
};
exports.default = connectDB;

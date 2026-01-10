"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const app_1 = require("../app");
const db_1 = __importDefault(require("../utils/db"));
// Vercel Serverless Function entrypoint.
// We reuse the existing Express `app` and ensure DB is connected.
async function handler(req, res) {
    await (0, db_1.default)();
    return (0, app_1.app)(req, res);
}

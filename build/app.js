"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
exports.app = (0, express_1.default)();
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
require('dotenv').config();
const error_1 = require("./middleware/error");
const user_route_1 = __importDefault(require("./routes/user.route"));
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: '50mb' }));
// CORS
// In dev we reflect the request origin to avoid issues when accessing the app via LAN IP.
// In production, prefer a strict allowlist via CLIENT_URL.
const corsOptions = {
    origin: process.env.NODE_ENV === "production"
        ? (origin, callback) => {
            const allowList = [
                process.env.CLIENT_URL,
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ].filter(Boolean);
            // Allow non-browser clients (no Origin header)
            if (!origin)
                return callback(null, true);
            if (allowList.includes(origin))
                return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        }
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
exports.app.use((0, cors_1.default)(corsOptions));
// Express 5 + path-to-regexp does not accept "*" here; use a RegExp to match all paths
exports.app.options(/.*/, (0, cors_1.default)(corsOptions));
//api for test
exports.app.get('/test', (req, res, next) => {
    res.status(200).json({ success: true, message: 'API is working' });
});
//routes
exports.app.use('/api/v1', user_route_1.default);
exports.app.use('/api/v1', course_route_1.default);
exports.app.use('/api/v1', order_route_1.default);
exports.app.use('/api/v1', notification_route_1.default);
exports.app.use('/api/v1', analytics_route_1.default);
exports.app.use('/api/v1', layout_route_1.default);
//for unknown routes
exports.app.use((req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.statusCode = 404;
    next(err);
});
exports.app.use(error_1.errorMiddleware);

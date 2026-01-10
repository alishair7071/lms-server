import express, { NextFunction, Request, Response } from 'express';
export const app = express();
import cors from 'cors';
import cookieParser from 'cookie-parser';
require('dotenv').config();
import { errorMiddleware } from './middleware/error';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRouter from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';


app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// CORS
// In dev we reflect the request origin to avoid issues when accessing the app via LAN IP.
// In production, prefer a strict allowlist via CLIENT_URL.
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? (origin, callback) => {
          const allowList = [
            process.env.CLIENT_URL,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
          ].filter(Boolean) as string[];

          // Allow non-browser clients (no Origin header)
          if (!origin) return callback(null, true);
          if (allowList.includes(origin)) return callback(null, true);
          return callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Express 5 + path-to-regexp does not accept "*" here; use a RegExp to match all paths
app.options(/.*/, cors(corsOptions));


//api for test
app.get('/test', (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({success: true, message: 'API is working' });
});


//routes
app.use('/api/v1', userRouter);
app.use('/api/v1', courseRouter);
app.use('/api/v1', orderRouter);
app.use('/api/v1', notificationRouter);
app.use('/api/v1', analyticsRouter);
app.use('/api/v1', layoutRouter);


//for unknown routes
app.use((req: Request, res: Response, next: NextFunction) => {
    const err= new Error(`Can't find ${req.originalUrl} on this server!`) as any;
    err.statusCode= 404;
    next(err);
});

app.use(errorMiddleware);

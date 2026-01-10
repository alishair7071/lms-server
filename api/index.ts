import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../app";
import connectDB from "../utils/db";

// Vercel Serverless Function entrypoint.
// We reuse the existing Express `app` and ensure DB is connected.
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await connectDB();
  return app(req as any, res as any);
}



require('dotenv').config();
import mongoose from 'mongoose';

const dbUrl: string= process.env.DB_URL || '';

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: typeof mongoose | null | undefined;
  // eslint-disable-next-line no-var
  var __mongoosePromise: Promise<typeof mongoose> | null | undefined;
}

const connectDB = async () => {
  if (!dbUrl) {
    throw new Error("DB_URL is not set");
  }

  try {
    // Cache the connection in serverless environments (e.g. Vercel) to avoid reconnecting on every request.
    if (global.__mongooseConn) return global.__mongooseConn;

    if (!global.__mongoosePromise) {
      global.__mongoosePromise = mongoose.connect(dbUrl);
    }

    global.__mongooseConn = await global.__mongoosePromise;
    console.log(
      `MongoDB connected with server: ${global.__mongooseConn.connection.host}`
    );
    return global.__mongooseConn;
  } catch (error: any) {
    console.log(`MongoDB connection error: ${error?.message ?? error}`);
    global.__mongoosePromise = null;
    global.__mongooseConn = null;
    throw error;
  }
};

export default connectDB;

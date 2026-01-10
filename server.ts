import {app} from './app';
import dotenv from 'dotenv';
import connectDB from './utils/db';
dotenv.config();
import {v2 as cloudinary} from 'cloudinary';
import http from 'http';
import { initSocketServer } from './socketServer';

const server = http.createServer(app);

initSocketServer(server);

//config cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//create server
const PORT = Number(process.env.PORT) || 10000;
const HOST = process.env.HOST || "0.0.0.0";

connectDB()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB. Exiting...", err);
    process.exit(1);
  });